import { Link, NavLink } from 'react-router-dom';
import { QrCode } from 'lucide-react';

export function CommunityNav() {
  return <nav className="c-community-tabs" aria-label="Secciones de la comunidad">
    <NavLink to="/feed">Feed</NavLink><NavLink to="/people">Personas</NavLink><NavLink to="/teams">Equipos</NavLink>
    <Link className="c-community-qr" to="/connect" aria-label="Conexiones, invitaciones y escanear QR"><QrCode size={18} aria-hidden="true" /><span>Conectar</span></Link>
  </nav>;
}
