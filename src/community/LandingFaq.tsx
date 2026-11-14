import { Link } from 'react-router-dom';

export function LandingFaq() {
  return <section className="lc-faq" aria-labelledby="lc-faq-title">
    <span className="lc-kicker">ANTES DE SALIR AL CAMPO</span>
    <h2 id="lc-faq-title">Preguntas frecuentes</h2>
    <details><summary>¿Es gratis de verdad?</summary><p>Sí. Organizar, apuntarse y publicar no tiene coste. Si el campo cuesta dinero, lo acordáis con quien organiza.</p></details>
    <details><summary>¿Por qué solo mayores de 18?</summary><p>Empezamos con adultos. Estamos preparando un sistema de tutores para que los menores puedan participar con autorización.</p></details>
    <details><summary>¿Por qué entrar con Google?</summary><p>Lo usamos solo para identificarte. Tu nombre público lo eliges tú y no publicamos tu correo.</p></details>
    <details><summary>¿Quién está detrás?</summary><p>Un proyecto de Rommer Volcanes, con vocación sin ánimo de lucro. <Link to="/about">Conoce el proyecto</Link>.</p></details>
  </section>;
}
