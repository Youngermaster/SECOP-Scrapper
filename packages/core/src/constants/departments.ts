/**
 * Colombian departments (DANE codes) with approximate centroids.
 * Centroids are a fallback; the scraper overrides them with DIVIPOLA coordinates.
 * `aliases` are accent-stripped upper-case spellings seen in SECOP datasets.
 */
export interface DepartmentDef {
  code: string;
  name: string;
  lat: number;
  lon: number;
  aliases: string[];
}

export const DEPARTMENTS: readonly DepartmentDef[] = [
  { code: '05', name: 'Antioquia', lat: 7.0, lon: -75.5, aliases: ['ANTIOQUIA'] },
  { code: '08', name: 'Atlántico', lat: 10.7, lon: -75.0, aliases: ['ATLANTICO'] },
  {
    code: '11',
    name: 'Bogotá D.C.',
    lat: 4.65,
    lon: -74.1,
    aliases: [
      'BOGOTA',
      'BOGOTA D C',
      'BOGOTA DC',
      'DISTRITO CAPITAL',
      'DISTRITO CAPITAL DE BOGOTA',
      'BOGOTA DISTRITO CAPITAL',
      'SANTAFE DE BOGOTA',
    ],
  },
  { code: '13', name: 'Bolívar', lat: 8.9, lon: -74.5, aliases: ['BOLIVAR'] },
  { code: '15', name: 'Boyacá', lat: 5.6, lon: -73.2, aliases: ['BOYACA'] },
  { code: '17', name: 'Caldas', lat: 5.3, lon: -75.5, aliases: ['CALDAS'] },
  { code: '18', name: 'Caquetá', lat: 0.9, lon: -74.0, aliases: ['CAQUETA'] },
  { code: '19', name: 'Cauca', lat: 2.4, lon: -76.8, aliases: ['CAUCA'] },
  { code: '20', name: 'Cesar', lat: 9.3, lon: -73.6, aliases: ['CESAR'] },
  { code: '23', name: 'Córdoba', lat: 8.4, lon: -75.8, aliases: ['CORDOBA'] },
  { code: '25', name: 'Cundinamarca', lat: 5.0, lon: -74.0, aliases: ['CUNDINAMARCA'] },
  { code: '27', name: 'Chocó', lat: 5.9, lon: -76.9, aliases: ['CHOCO'] },
  { code: '41', name: 'Huila', lat: 2.5, lon: -75.6, aliases: ['HUILA'] },
  { code: '44', name: 'La Guajira', lat: 11.5, lon: -72.5, aliases: ['LA GUAJIRA', 'GUAJIRA'] },
  { code: '47', name: 'Magdalena', lat: 10.2, lon: -74.3, aliases: ['MAGDALENA'] },
  { code: '50', name: 'Meta', lat: 3.4, lon: -73.0, aliases: ['META'] },
  { code: '52', name: 'Nariño', lat: 1.5, lon: -77.8, aliases: ['NARINO'] },
  {
    code: '54',
    name: 'Norte de Santander',
    lat: 8.0,
    lon: -72.9,
    aliases: ['NORTE DE SANTANDER', 'NORTE SANTANDER'],
  },
  { code: '63', name: 'Quindío', lat: 4.5, lon: -75.7, aliases: ['QUINDIO'] },
  { code: '66', name: 'Risaralda', lat: 5.0, lon: -76.0, aliases: ['RISARALDA'] },
  { code: '68', name: 'Santander', lat: 6.7, lon: -73.4, aliases: ['SANTANDER'] },
  { code: '70', name: 'Sucre', lat: 9.1, lon: -75.2, aliases: ['SUCRE'] },
  { code: '73', name: 'Tolima', lat: 4.0, lon: -75.2, aliases: ['TOLIMA'] },
  {
    code: '76',
    name: 'Valle del Cauca',
    lat: 3.9,
    lon: -76.5,
    aliases: ['VALLE DEL CAUCA', 'VALLE'],
  },
  { code: '81', name: 'Arauca', lat: 6.6, lon: -71.0, aliases: ['ARAUCA'] },
  { code: '85', name: 'Casanare', lat: 5.4, lon: -71.8, aliases: ['CASANARE'] },
  { code: '86', name: 'Putumayo', lat: 0.5, lon: -76.0, aliases: ['PUTUMAYO'] },
  {
    code: '88',
    name: 'San Andrés y Providencia',
    lat: 12.55,
    lon: -81.7,
    aliases: [
      'SAN ANDRES',
      'SAN ANDRES Y PROVIDENCIA',
      'SAN ANDRES PROVIDENCIA Y SANTA CATALINA',
      'ARCHIPIELAGO DE SAN ANDRES',
      'ARCHIPIELAGO DE SAN ANDRES PROVIDENCIA Y SANTA CATALINA',
    ],
  },
  { code: '91', name: 'Amazonas', lat: -1.0, lon: -71.9, aliases: ['AMAZONAS'] },
  { code: '94', name: 'Guainía', lat: 2.7, lon: -68.9, aliases: ['GUAINIA'] },
  { code: '95', name: 'Guaviare', lat: 2.0, lon: -72.6, aliases: ['GUAVIARE'] },
  { code: '97', name: 'Vaupés', lat: 0.9, lon: -70.6, aliases: ['VAUPES'] },
  { code: '99', name: 'Vichada', lat: 4.7, lon: -69.4, aliases: ['VICHADA'] },
];

export const DEPARTMENT_BY_CODE: ReadonlyMap<string, DepartmentDef> = new Map(
  DEPARTMENTS.map((d) => [d.code, d]),
);
