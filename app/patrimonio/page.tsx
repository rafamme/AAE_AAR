import Link from 'next/link';
import HeritageExplorer from '../../components/HeritageExplorer';
import { getPublishedLocations, getPublishedMonuments } from '../../lib/catalog';

export default async function HeritagePage() {
  const [locations, monuments] = await Promise.all([
    getPublishedLocations(),
    getPublishedMonuments(),
  ]);

  const countries = new Set(locations.map((item) => item.country));
  const regions = new Set(locations.map((item) => item.region).filter(Boolean));

  return (
    <main className="wrap catalog-page">
      <nav className="catalog-nav">
        <Link href="/">Mapa</Link>
        <Link href="/patrimonio">Patrimonio</Link>
        <Link href="/login">Área de socios</Link>
      </nav>

      <header className="catalog-hero">
        <div className="eyebrow">Patrimonio románico europeo</div>
        <h1>Explora por territorio, localidad y monumento</h1>
        <p>
          Busca y filtra el catálogo público de la asociación por país, región,
          localidad, monumento, estilo o siglo. Solo aparecen contenidos revisados y publicados.
        </p>
        <div className="catalog-stat-strip">
          <span><strong>{countries.size}</strong> países</span>
          <span><strong>{regions.size}</strong> regiones</span>
          <span><strong>{locations.length}</strong> localidades</span>
          <span><strong>{monuments.length}</strong> monumentos</span>
        </div>
      </header>

      <HeritageExplorer locations={locations} monuments={monuments} />
    </main>
  );
}
