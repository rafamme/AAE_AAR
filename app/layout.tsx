import type { Metadata } from 'next';
import 'leaflet/dist/leaflet.css';
import './globals.css';
import './theme.css';
import { getSiteControl } from '../lib/site-control';

export const metadata: Metadata = {
  title: 'AAE-AAR · Arte Románico',
  description: 'Mapa y catálogo de arte románico europeo'
};

export default async function RootLayout({children}:{children:React.ReactNode}) {
  const control = await getSiteControl();
  const theme = control.setting('ui.theme','light');
  const accent = control.setting('ui.accent','stone');
  return <html lang="es" data-theme={theme} data-accent={accent}><body>{children}</body></html>;
}
