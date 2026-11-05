import {config} from 'dotenv';
config({path:new URL('../../.env',import.meta.url).pathname});
import express from 'express';
import session from 'express-session';
import helmet from 'helmet';
import {google} from 'googleapis';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const app=express();const port=Number(process.env.PORT||3001);const origin=process.env.APP_ORIGIN||'http://localhost:5173';
const googleEnabled=Boolean(process.env.GOOGLE_CLIENT_ID&&process.env.GOOGLE_CLIENT_SECRET&&process.env.GOOGLE_SPREADSHEET_ID);
const oauth=new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID,process.env.GOOGLE_CLIENT_SECRET,process.env.GOOGLE_REDIRECT_URI||`http://localhost:${port}/auth/google/callback`);
type Mission={id:string;title:string;area:string;priority:'CRÍTICA'|'ALTA'|'MEDIA';xp:number;done:boolean;createdAt:string};
type Goal={id:string;title:string;area:string;status:string};
type Skill={id:string;name:string;level:number;progress:number};
type Data={missions:Mission[];goals:Goal[];skills:Skill[]};
const seed:Data={missions:[{id:'m1',title:'Preparar demo comercial de Tkila Box',area:'EMPIRE',priority:'CRÍTICA',xp:120,done:false,createdAt:new Date().toISOString()},{id:'m2',title:'Completar laboratorio de redes TCP/IP',area:'CYBER',priority:'MEDIA',xp:60,done:false,createdAt:new Date().toISOString()},{id:'m3',title:'Definir objetivos de ASCENSION',area:'MIND',priority:'ALTA',xp:40,done:false,createdAt:new Date().toISOString()},{id:'m4',title:'Practicar técnica vocal 20 minutos',area:'BODY',priority:'MEDIA',xp:30,done:false,createdAt:new Date().toISOString()}],goals:[{id:'g1',title:'Convertir Tkila en ingresos recurrentes',area:'EMPIRE',status:'active'},{id:'g2',title:'Desarrollar capacidades científicas verificables',area:'MIND',status:'active'}],skills:[{id:'s1',name:'Ciberseguridad',level:1,progress:0},{id:'s2',name:'Robótica',level:1,progress:0},{id:'s3',name:'Neurociencia',level:1,progress:0}]};
declare module 'express-session'{interface SessionData{tokens?:{access_token?:string|null;refresh_token?:string|null;expiry_date?:number|null};state?:string}}
app.use(helmet({contentSecurityPolicy:false}));app.use(express.json({limit:'32kb'}));app.use(session({name:'ascension.sid',secret:process.env.SESSION_SECRET||'local-dev-only-change-me',resave:false,saveUninitialized:false,cookie:{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',maxAge:86400000}}));
const file=path.resolve(process.cwd(),'server/data/local.json');
async function localRead():Promise<Data>{try{return JSON.parse(await fs.readFile(file,'utf8'))}catch{return structuredClone(seed)}}
async function localWrite(data:Data){await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,JSON.stringify(data,null,2))}
const tabNames=['missions','goals','skills'] as const;
const headers:Record<keyof Data,string[]>={missions:['id','title','area','priority','xp','done','createdAt'],goals:['id','title','area','status'],skills:['id','name','level','progress']};
function client(req:express.Request){const auth=new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID,process.env.GOOGLE_CLIENT_SECRET,process.env.GOOGLE_REDIRECT_URI);auth.setCredentials(req.session.tokens||{});return google.sheets({version:'v4',auth})}
async function sheetsRead(req:express.Request):Promise<Data>{const id=process.env.GOOGLE_SPREADSHEET_ID!;const api=client(req);const meta=await api.spreadsheets.get({spreadsheetId:id,fields:'sheets.properties.title'});const existing=new Set((meta.data.sheets||[]).map(s=>s.properties?.title));const missing=tabNames.filter(n=>!existing.has(n));if(missing.length){await api.spreadsheets.batchUpdate({spreadsheetId:id,requestBody:{requests:missing.map(title=>({addSheet:{properties:{title}}}))}});for(const name of missing)await api.spreadsheets.values.update({spreadsheetId:id,range:`${name}!A1`,valueInputOption:'RAW',requestBody:{values:[headers[name]]}})}
const out={} as Data;for(const name of tabNames){const result=await api.spreadsheets.values.get({spreadsheetId:id,range:`${name}!A2:Z`});const rows=result.data.values||[];const values=rows.map(row=>Object.fromEntries(headers[name].map((key,i)=>[key,row[i]??''])));if(name==='missions')out.missions=values.map(v=>({...v,xp:Number(v.xp),done:v.done===true||v.done==='TRUE'||v.done==='true'})) as Mission[];if(name==='goals')out.goals=values as Goal[];if(name==='skills')out.skills=values.map(v=>({...v,level:Number(v.level),progress:Number(v.progress)})) as Skill[];}return out}
async function sheetsWrite(req:express.Request,data:Data){const api=client(req);const id=process.env.GOOGLE_SPREADSHEET_ID!;await api.spreadsheets.values.batchUpdate({spreadsheetId:id,requestBody:{valueInputOption:'RAW',data:tabNames.map(name=>({range:`${name}!A1:Z`,values:[headers[name],...data[name].map(record=>headers[name].map(key=>String((record as unknown as Record<string,unknown>)[key]??'')))]}))}});}
async function read(req:express.Request){return googleEnabled?sheetsRead(req):localRead()}
async function write(req:express.Request,data:Data){return googleEnabled?sheetsWrite(req,data):localWrite(data)}
function guard(req:express.Request,res:express.Response,next:express.NextFunction){if(googleEnabled&&!req.session.tokens?.access_token){res.status(401).json({error:'Inicia sesión con Google'});return}next()}
app.get('/api/session',(req,res)=>res.json({mode:googleEnabled?'google':'local-demo',authenticated:!googleEnabled||Boolean(req.session.tokens?.access_token)}));
app.get('/auth/google',(req,res)=>{if(!googleEnabled)return res.status(400).send('Configura OAuth primero');const state=crypto.randomBytes(24).toString('hex');req.session.state=state;res.redirect(oauth.generateAuthUrl({access_type:'offline',prompt:'consent',scope:['https://www.googleapis.com/auth/spreadsheets'],state}))});
app.get('/auth/google/callback',async(req,res)=>{try{if(!req.query.state||req.query.state!==req.session.state)return res.status(403).send('Estado OAuth inválido');delete req.session.state;const {tokens}=await oauth.getToken(String(req.query.code));req.session.tokens=tokens;res.redirect(origin)}catch(e){console.error(e);res.status(500).send('Error en autenticación')}});
app.post('/auth/logout',(req,res)=>req.session.destroy(()=>res.json({ok:true})));
app.get('/api/dashboard',guard,async(req,res)=>{try{const data=await read(req);res.json(data)}catch(e){console.error(e);res.status(500).json({error:'No se pudieron leer los datos'})}});
app.post('/api/missions',guard,async(req,res)=>{const title=String(req.body.title||'').trim().slice(0,180);const area=String(req.body.area||'MIND').slice(0,30);if(!title)return res.status(400).json({error:'Título obligatorio'});try{const data=await read(req);const mission:Mission={id:crypto.randomUUID(),title,area,priority:'MEDIA',xp:30,done:false,createdAt:new Date().toISOString()};data.missions.push(mission);await write(req,data);res.status(201).json(mission)}catch(e){console.error(e);res.status(500).json({error:'No se pudo guardar'})}});
app.patch('/api/missions/:id',guard,async(req,res)=>{if(typeof req.body.done!=='boolean')return res.status(400).json({error:'done debe ser boolean'});try{const data=await read(req);const mission=data.missions.find(m=>m.id===req.params.id);if(!mission)return res.status(404).json({error:'Misión no encontrada'});mission.done=req.body.done;await write(req,data);res.json(mission)}catch(e){console.error(e);res.status(500).json({error:'No se pudo actualizar'})}});
app.listen(port,()=>console.log(`ASCENSION server http://localhost:${port} (${googleEnabled?'Google Sheets':'local demo'})`));
