export default function BrandLogo({ decorative = false }) {
  return <img className="brand-logo" src={`${import.meta.env.BASE_URL}brand/logo-sabores-de-oaxaca.png`}
    alt={decorative ? '' : 'Sabores de Oaxaca'} width={560} height={278} />
}
