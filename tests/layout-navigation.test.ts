import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

// Render the actual layout with inert providers: no Firebase, account or network writes.
function renderLayout(profile: object | null, pathname = '/', loading = false) {
  const jsx = (type: unknown, props: any) => ({ type, props });
  const api = { profile, loading, mode:'cloud', eventNotices:[], runtimeConfig:{ serviceStatus:'open' } };
  const modules: Record<string, unknown> = {
    'react/jsx-runtime':{ jsx, jsxs:jsx },
    react:{ useEffect:()=>{}, useRef:(current:unknown)=>({current}), useState:(initial:unknown)=>[initial,()=>{}] },
    'react-router-dom':{ Link:'Link', NavLink:'NavLink', Outlet:'Outlet', useLocation:()=>({pathname,search:''}) },
    'lucide-react':new Proxy({}, { get:(_, key)=>String(key) }),
    './CommunityContext':{ useCommunity:()=>api, TERMS_VERSION:'current' },
    './InvitationsContext':{ useInvitations:()=>({incomingInvitations:[]}) },
    './MessagingContext':{ useMessaging:()=>({unreadCount:0}) },
    './experience':{ profileNavigationKey:()=>pathname, profileInitials:()=> 'QA' },
  };
  const source = readFileSync(new URL('../src/community/CommunityPages.tsx', import.meta.url),'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions:{ target:ts.ScriptTarget.ES2022, module:ts.ModuleKind.CommonJS, jsx:ts.JsxEmit.ReactJSX } }).outputText.replaceAll('import.meta.env', 'testEnv');
  const exports: any = {};
  new Function('exports','require','testEnv',compiled)(exports,(name:string)=>modules[name] || {}, {DEV:false});
  const nodes = (node:any):any[] => Array.isArray(node) ? node.flatMap(nodes) : node && typeof node === 'object' ? [node,...nodes(node.props?.children)] : [];
  return nodes(exports.CommunityLayout());
}

for (const pathname of ['/', '/play', '/feed', '/teams', '/profile', '/messages/conversation']) {
  test(`Visitante en ${pathname}: sin barra inferior y con rutas públicas y acceso`, () => {
    const nodes = renderLayout(null, pathname);
    assert.equal(nodes.some(node=>node.props?.['aria-label']==='Navegación móvil'), false);
    const header = nodes.find(node=>node.props?.['aria-label']==='Navegación principal');
    assert.ok(header);
    assert.deepEqual(header.props.children.flat().filter(Boolean).map((node:any)=>node.props.to), ['/', '/play', '/feed', '/teams']);
    assert.ok(nodes.some(node=>node.props?.to==='/profile?intent=login'));
  });
}

test('La comprobación inicial de la sesión no muestra una barra de cuenta', () => {
  assert.equal(renderLayout(null, '/', true).some(node=>node.props?.['aria-label']==='Navegación móvil'), false);
});

test('La cuenta conectada conserva las cinco acciones y el acceso a creación', () => {
  const nodes = renderLayout({ id:'qa-local-only', name:'Prueba', city:'Madrid', country:'España' });
  const nav = nodes.find(node=>node.props?.['aria-label']==='Navegación móvil');
  assert.ok(nav);
  const items = nav.props.children.filter(Boolean);
  assert.equal(items.length, 5);
  assert.deepEqual(items.filter((node:any)=>node.props.to).map((node:any)=>node.props.to), ['/', '/play', '/feed', '/profile']);
  const create = items.find((node:any)=>node.props['aria-label']==='Crear');
  assert.equal(create.type, 'button');
  assert.equal(create.props['aria-haspopup'], 'dialog');
  assert.equal(typeof create.props.onClick, 'function');
});
