import { useEffect, useRef, useState } from 'react';
import { Download, Play } from 'lucide-react';

const assets = `${import.meta.env.BASE_URL}tutorial/ios/`;
const steps = [
  { title: 'Abre el menú de Safari.', text: 'En lacantera.web.app, toca el botón de las líneas junto a la dirección.', image: 'safari-menu.webp', alt: 'Barra de Safari: el menú de página está a la izquierda de lacantera.web.app.' },
  { title: 'Toca «Compartir».', text: 'En otros diseños de Safari, Compartir aparece directamente en la barra.', image: 'share-action.webp', alt: 'Acción Compartir en el menú de página de Safari.' },
  { title: 'Elige «Añadir a pantalla de inicio».', text: 'Busca entre las acciones. Si no aparece, revisa «Ver más» o «Editar acciones».', image: 'add-to-home.webp', alt: 'Menú Compartir con la opción Añadir a pantalla de inicio.' },
  { title: 'Activa «Abrir como app web».', text: 'Si aparece esta opción, deja el interruptor en verde.', image: 'open-as-app.webp', alt: 'Interruptor Abrir como app web activado.' },
  { title: 'Confirma con «Añadir».', text: 'Conserva el nombre LaCantera. Después busca su icono en la pantalla de inicio.', image: 'confirm-add.webp', alt: 'Pantalla de confirmación con el nombre LaCantera y el botón Añadir arriba a la derecha.' },
];

/** Video is fetched only after choosing play; the transcript works without motion. */
export function InstallationTutorial() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [playError, setPlayError] = useState(false);
  useEffect(() => {
    if (started) videoRef.current?.focus({ preventScroll: true });
  }, [started]);
  function playTutorial() {
    setLoading(true);
    setPlayError(false);
    // Keep play() inside the user gesture so Safari can start inline playback.
    videoRef.current?.play().then(() => {
      setStarted(true);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
      setPlayError(true);
    });
  }
  return <section className="c-install-tutorial" aria-label="Tutorial visual para instalar LaCantera con Safari">
    <p className="c-install-video-label">Con capturas reales de Safari · 36 segundos · sin sonido</p>
    <div className="c-install-player">
    <video ref={videoRef} className="c-install-video" style={{ visibility: started ? 'visible' : 'hidden' }} controls playsInline preload="none" poster={`${assets}poster.webp`} width="1080" height="1920" aria-hidden={!started} tabIndex={started ? 0 : -1} aria-label="Tutorial: instalar LaCantera en iPhone, en cinco pasos">
      <source src={`${assets}instalar-lacantera-iphone.mp4`} type="video/mp4" />
      <track kind="captions" src={`${assets}instalacion-es.vtt`} srcLang="es" label="Español" />
      Tu navegador no puede reproducir el vídeo. Consulta los pasos con imágenes a continuación.
    </video>
    {!started ? <button className="c-install-play" type="button" onClick={playTutorial} disabled={loading} aria-busy={loading} aria-label="Reproducir tutorial de instalación, 36 segundos">
      <img src={`${assets}poster.webp`} alt="" width="720" height="1280" />
      <span className="c-install-play-label"><Play size={22} fill="currentColor" aria-hidden="true" />{loading ? 'Cargando…' : 'Ver tutorial'}<small>36 s</small></span>
    </button> : null}
    </div>
    {playError ? <p role="status" className="c-install-tutorial-note">No se pudo reproducir. Puedes reintentarlo, descargar el vídeo o seguir los pasos con imágenes.</p> : null}
    <a className="c-install-download" href={`${assets}instalar-lacantera-iphone.mp4`} download="Instalar-LaCantera-iPhone.mp4"><Download size={16} aria-hidden="true" />Descargar el tutorial</a>
    <details className="c-install-image-steps"><summary>Ver los cinco pasos con imágenes</summary><ol className="c-install-steps">{steps.map((step, index) => <li key={step.image}>
      <strong>{step.title}</strong><span>{step.text}</span><img src={`${assets}${step.image}`} alt={step.alt} loading="lazy" decoding="async" />
      {index === 1 ? <details className="c-install-menu-context"><summary>Ver el menú completo</summary><img src={`${assets}share-context.webp`} alt="Parte superior del menú de Safari con Compartir como primera acción." loading="lazy" decoding="async" /></details> : null}
    </li>)}</ol></details>
    <p className="c-install-tutorial-note">Las capturas son de iPhone. En iPad, busca las mismas acciones en Compartir. El aspecto puede cambiar según la versión de Safari.</p>
  </section>;
}
