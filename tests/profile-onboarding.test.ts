import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { TERMS_VERSION } from '../src/community/policy.ts';
import { canonicalCountry } from '../src/community/geography.ts';
import { safeReturnTo } from '../src/community/teamLogic.ts';

const fixture = (extra = {}) => ({ id: 'new-google', name: 'Perfil propio', bio: '', city: '', country: '', position: '', team: '',
  level: 'amateur', adultConfirmed: false, verification: 'unverified', entityType: 'individual', createdAt: '2026-10-13T12:00:00.000Z',
  acceptedTermsVersion: '', acceptedTermsAt: '', ...extra });
const confirmed = { city: 'Å', country: 'Noruega', adultConfirmed: true, acceptedTermsVersion: TERMS_VERSION, acceptedTermsAt: '2026-10-13T12:01:00.000Z' };

// Execute the real keyed ProfilePage/ProfileAccount UI with controlled hooks.
// No Google identity, consent or cloud record is created by this harness.
function profileHarness(initial: any, returnTo = '') {
  let cursor = 0, dirty = false, componentKey: string | undefined;
  let routeParams = new URLSearchParams({ returnTo });
  let slots: any[] = [], effects: Array<() => void> = [], cleanups: Array<(() => void) | undefined> = [];
  const saves: any[] = [], navigated: string[] = [];
  const api: any = { profile: initial, mode: 'cloud', isAdmin: false, serviceAvailable: true, pilotEnabled: false, demoEnabled: false,
    runtimeConfig: { serviceStatus: 'open' }, verificationRequests: [], ownEvents: [], rightsRequests: [], followingIds: [],
    async saveProfile(input: any) { saves.push(input); }, async login() {}, async signOut() {}, async requestVerification() {}, async requestRights() {} };
  const navigate = (path: string) => navigated.push(path);
  const react = {
    useState(value: any) {
      const index = cursor++;
      if (!Object.hasOwn(slots, index)) slots[index] = typeof value === 'function' ? value() : value;
      return [slots[index], (next: any) => { const result = typeof next === 'function' ? next(slots[index]) : next;
        if (!Object.is(result, slots[index])) { slots[index] = result; dirty = true; } }];
    },
    useRef(value: any) { const index = cursor++; return slots[index] ||= { current: value }; },
    useEffect(effect: () => any, dependencies: unknown[]) {
      const index = cursor++, previous = slots[index];
      if (!previous || dependencies.some((value, offset) => previous[offset] !== value)) {
        slots[index] = dependencies; effects.push(() => { cleanups[index]?.(); cleanups[index] = effect(); });
      }
    },
  };
  const jsx = (type: any, props: any, key: any) => ({ type, props, key });
  const modules: Record<string, any> = { react, 'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' },
    'react-router-dom': { Link: 'Link', useNavigate: () => navigate, useSearchParams: () => [routeParams] },
    '../components/BrandMark': { default: 'BrandMark' },
    'lucide-react': {}, './CommunityContext': { useCommunity: () => api, TERMS_VERSION, friendlyError: (error: Error) => error.message },
    './TeamsContext': { useTeams: () => ({ ownTeams: [] }) }, './teamLogic': { safeReturnTo }, './GeographyFields': { CountryInput: 'CountryInput' },
    './geography': { canonicalCountry }, './legal': { legalReady: true, operator: { email: 'support@example.test' } } };
  const source = readFileSync(new URL('../src/community/ProfilePage.tsx', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports: any = {};
  new Function('exports', 'require', 'window', compiled)(exports, (name: string) => modules[name], { addEventListener() {}, removeEventListener() {} });
  let tree: any;
  function render() {
    for (let attempt = 0; attempt < 15; attempt++) {
      const page = exports.ProfilePage();
      if (page.key !== componentKey) {
        cleanups.forEach(cleanup => cleanup?.()); componentKey = page.key; slots = []; effects = []; cleanups = [];
      }
      dirty = false; cursor = 0; tree = page.type(page.props);
      while (effects.length) effects.shift()!();
      if (!dirty) return tree;
    }
    throw new Error('El perfil no alcanzó un render estable.');
  }
  function nodes(node: any): any[] { if (!node || typeof node !== 'object') return []; if (Array.isArray(node)) return node.flatMap(nodes);
    return [node, ...nodes(node.props?.children)]; }
  function text(node: any): string { if (node == null || typeof node === 'boolean') return ''; if (Array.isArray(node)) return node.map(text).join('');
    return typeof node === 'object' ? text(node.props?.children) : String(node); }
  render();
  return { api, saves, navigated, render, text: () => text(tree),
    nodes: () => nodes(tree),
    label(value: string) { const label = nodes(tree).find(node => node.type === 'label' && text(node).startsWith(value));
      assert.ok(label, `Falta campo: ${value}`); const input = nodes(label).find(node => ['input', 'CountryInput'].includes(node.type));
      assert.ok(input, `Falta entrada: ${value}`); return input; },
    async settle() { for (let attempt = 0; attempt < 3; attempt++) { await new Promise(resolve => setImmediate(resolve)); render(); } },
    changeProfile(value: any) { api.profile = value; render(); },
    followLink(target: string) { routeParams = new URL(target, 'https://cantera.example').searchParams; render(); },
    cleanup() { cleanups.forEach(cleanup => cleanup?.()); } };
}

test('alternar registro e inicio conserva el enlace de invitación sin crear perfil ni aceptación antes de entrar', () => {
  for (const destination of ['/connect?code=23456789ABCDEFGH', '/teams/join/invitation-token', '/play?create=1&type=tournament']) {
    const h = profileHarness(null, destination);
    try {
      assert.match(h.text(), /Únete a la comunidad/);
      assert.ok(h.nodes().some(node => node.type === 'BrandMark'));
      const login = h.nodes().find(node => node.type === 'Link' && node.props.children === 'Inicia sesión');
      assert.ok(login); assert.equal(new URL(login.props.to, 'https://cantera.example').searchParams.get('returnTo'), destination);
      h.followLink(login.props.to); assert.match(h.text(), /Bienvenido de vuelta/);
      const registration = h.nodes().find(node => node.type === 'Link' && node.props.children === 'Únete gratis');
      assert.ok(registration); assert.equal(new URL(registration.props.to, 'https://cantera.example').searchParams.get('returnTo'), destination);
      h.followLink(registration.props.to); assert.match(h.text(), /Únete a la comunidad/);
      assert.equal(h.api.profile, null); assert.deepEqual(h.saves, []); assert.deepEqual(h.navigated, []);
      h.changeProfile(fixture(confirmed));
      assert.deepEqual(h.navigated, [destination]); assert.deepEqual(h.saves, []);
      assert.equal(h.api.profile.acceptedTermsVersion, TERMS_VERSION);
      assert.equal(h.api.profile.acceptedTermsAt, confirmed.acceptedTermsAt);
    } finally { h.cleanup(); }
  }
});

test('ciudad de un carácter reconoce el perfil completo y vuelve a la invitación sin reaceptar ni guardar', () => {
  const h = profileHarness(fixture(confirmed), '/invite/23456789ABCDEFGH');
  try {
    assert.match(h.text(), /Perfil propio/); assert.doesNotMatch(h.text(), /Completa tu cuenta/);
    assert.ok(h.nodes().some(node => node.type === 'Link' && node.props.to === '/people/new-google'));
    assert.deepEqual(h.navigated, ['/invite/23456789ABCDEFGH']); assert.deepEqual(h.saves, []);
  } finally { h.cleanup(); }
});

test('edad, términos actuales, fecha y ubicación siguen siendo necesarios para reconocer cuenta completa', () => {
  for (const extra of [{ adultConfirmed: false }, { acceptedTermsVersion: '2026-10-05' }, { acceptedTermsAt: '' },
    { acceptedTermsAt: 'fecha inválida' }, { city: '' }, { city: '   ' }, { country: '' }, { country: '   ' }]) {
    const h = profileHarness(fixture({ ...confirmed, ...extra }), '/connect');
    try { assert.match(h.text(), /Completa tu cuenta/); assert.deepEqual(h.navigated, []); assert.deepEqual(h.saves, []);
      const request = h.nodes().find(node => node.type === 'button' && node.props.children === 'Solicitar verificación');
      assert.ok(request); assert.equal(request.props.disabled, true);
    } finally { h.cleanup(); }
  }
});

test('cuenta Google nueva empieza vacía sin consentimientos y sólo envía aceptación después de sus cambios explícitos', async () => {
  const h = profileHarness(fixture(), '/feed');
  try {
    assert.equal(h.label('Ciudad').props.value, ''); assert.equal(h.label('País').props.value, '');
    assert.equal(h.label('Soy mayor').props.checked, false); assert.equal(h.label('Acepto').props.checked, false);
    assert.deepEqual(h.saves, []); assert.deepEqual(h.navigated, []);
    h.label('Ciudad').props.onChange({ target: { value: ' Å ' } }); h.render();
    h.label('País').props.onChange('NO'); h.render();
    h.label('Soy mayor').props.onChange({ target: { checked: true } }); h.render();
    h.label('Acepto').props.onChange({ target: { checked: true } }); h.render();
    assert.equal(h.api.profile.adultConfirmed, false); assert.equal(h.api.profile.acceptedTermsVersion, '');
    h.nodes().find(node => node.type === 'form' && node.props.className === 'c-panel c-account-form')!.props.onSubmit({ preventDefault() {} });
    await h.settle();
    assert.equal(h.saves.length, 1); assert.equal(h.saves[0].city, 'Å'); assert.equal(h.saves[0].country, 'Noruega');
    assert.equal(h.saves[0].adultConfirmed, true); assert.equal(h.saves[0].acceptedTermsVersion, TERMS_VERSION);
    assert.ok(Number.isFinite(Date.parse(h.saves[0].acceptedTermsAt))); assert.deepEqual(h.navigated, ['/feed']);
  } finally { h.cleanup(); }
});

test('cambio de cuenta descarta el borrador y las confirmaciones de la identidad anterior', () => {
  const h = profileHarness(fixture());
  try {
    h.label('Nombre público').props.onChange({ target: { value: 'Borrador anterior' } }); h.render();
    h.label('Acepto').props.onChange({ target: { checked: true } }); h.render();
    h.changeProfile(fixture({ id: 'second-google', name: 'Nueva identidad' }));
    assert.equal(h.label('Nombre público').props.value, 'Nueva identidad'); assert.equal(h.label('Acepto').props.checked, false);
    assert.equal(h.label('Soy mayor').props.checked, false); assert.doesNotMatch(h.text(), /Borrador anterior/);
    assert.deepEqual(h.saves, []); assert.deepEqual(h.navigated, []);
  } finally { h.cleanup(); }
});
