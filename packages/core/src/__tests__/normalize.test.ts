import { describe, expect, it } from 'vitest';
import {
  addDays,
  buildSearchText,
  canonicalDepartment,
  canonicalModality,
  canonicalPhase,
  canonicalStatus,
  cleanString,
  cleanSupplierName,
  cleanUrl,
  daysBetween,
  modalityAcceptsOffers,
  normalizeKey,
  normalizeText,
  parseMoney,
  parseNumber,
  parseSocrataDate,
  parseUnspsc,
  parseYesNo,
  startOfWeekISO,
  stripAccents,
} from '../normalize';

describe('format', () => {
  it('formats compact COP across magnitudes', async () => {
    const { formatCOPCompact, formatCOP, formatDate } = await import('../format');
    expect(formatCOPCompact(null)).toBe('—');
    expect(formatCOPCompact(48_000_000)).toBe('$ 48,0 M');
    expect(formatCOPCompact(1_592_769_513)).toBe('$ 1,6 mil M');
    expect(formatCOPCompact(13_284_600_000_000)).toBe('$ 13,3 billones');
    expect(formatCOP(24_082_620)).toMatch(/24\.082\.620/);
    expect(formatDate('2026-09-14')).toBe('14 sep 2026');
  });
});

describe('text', () => {
  it('strips accents and normalizes', () => {
    expect(stripAccents('Itagüí Bogotá ñandú')).toBe('Itagui Bogota nandu');
    expect(normalizeText('  Desarrollo   de SOFTWARE ')).toBe('desarrollo de software');
    expect(normalizeKey('Bogotá, D.C.')).toBe('BOGOTA D C');
    expect(normalizeKey('Itagüí')).toBe('ITAGUI');
  });
  it('nullifies SECOP placeholders (all casings)', () => {
    expect(cleanString('No Definido')).toBeNull();
    expect(cleanString('No definido')).toBeNull();
    expect(cleanString('No Aplica')).toBeNull();
    expect(cleanString('No Especificado')).toBeNull();
    expect(cleanString('No Adjudicado')).toBeNull();
    expect(cleanString('No')).toBeNull();
    expect(cleanString('   ')).toBeNull();
    expect(cleanString(undefined)).toBeNull();
    expect(cleanString('  Medellín  ')).toBe('Medellín');
    expect(cleanString(42)).toBe('42');
  });
  it('parses yes/no', () => {
    expect(parseYesNo('Si')).toBe(true);
    expect(parseYesNo('Sí')).toBe(true);
    expect(parseYesNo('No')).toBe(false);
    expect(parseYesNo('tal vez')).toBeNull();
  });
  it('strips contact junk from supplier names', () => {
    expect(
      cleanSupplierName('Royal Tech Group SAS (cotizaciones@royaltech.group - 3155482662)'),
    ).toBe('Royal Tech Group SAS');
    expect(cleanSupplierName('CREAR IMAGEN IT - licitaciones@crearimagen.agency')).toBe(
      'CREAR IMAGEN IT',
    );
    expect(cleanSupplierName('ACME S.A.S. [NIT 900123456]')).toBe('ACME S.A.S.');
    expect(cleanSupplierName('Bizagi (Colombia)')).toBe('Bizagi (Colombia)');
    expect(cleanSupplierName('No Definido')).toBeNull();
  });
  it('builds a search haystack', () => {
    expect(buildSearchText(['Robótica', null, '  ', 'APP Móvil'])).toBe('robotica | app movil');
  });
});

describe('number', () => {
  it('parses Socrata and DIVIPOLA numbers', () => {
    expect(parseNumber('24082620')).toBe(24082620);
    expect(parseNumber('6,246631')).toBeCloseTo(6.246631);
    expect(parseNumber('-75,581775')).toBeCloseTo(-75.581775);
    expect(parseNumber('1.234.567,89')).toBeCloseTo(1234567.89);
    expect(parseNumber('1,234,567')).toBe(1234567);
    expect(parseNumber('$ 1.500.000')).toBe(1500000);
    expect(parseNumber('abc')).toBeNull();
    expect(parseNumber('')).toBeNull();
    expect(parseNumber(undefined)).toBeNull();
  });
  it('treats zero money as unknown', () => {
    expect(parseMoney('0')).toBeNull();
    expect(parseMoney('-5')).toBeNull();
    expect(parseMoney('48000000')).toBe(48000000);
  });
});

describe('date', () => {
  it('parses Socrata floating timestamps to ISO dates', () => {
    expect(parseSocrataDate('2026-09-14T00:00:00.000')).toBe('2026-09-14');
    expect(parseSocrataDate('2026-09-14')).toBe('2026-09-14');
    expect(parseSocrataDate('14/09/2026')).toBe('2026-09-14');
    expect(parseSocrataDate('2026-02-30T00:00:00.000')).toBeNull();
    expect(parseSocrataDate('1900-01-01T00:00:00.000')).toBeNull();
    expect(parseSocrataDate('garbage')).toBeNull();
  });
  it('does day arithmetic', () => {
    expect(daysBetween('2026-09-16', '2026-09-25')).toBe(9);
    expect(daysBetween('2026-09-16', '2026-09-10')).toBe(-6);
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
    expect(startOfWeekISO('2026-09-16')).toBe('2026-09-14'); // Wednesday → Monday
    expect(startOfWeekISO('2026-09-20')).toBe('2026-09-14'); // Sunday → previous Monday
  });
});

describe('url', () => {
  it('classifies real, polluted and missing URLs', () => {
    const ok = cleanUrl({
      url: 'https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.10889582',
    });
    expect(ok.status).toBe('ok');
    expect(ok.noticeUid).toBe('CO1.NTC.10889582');
    expect(cleanUrl({ url: 'https://community.secop.gov.co/STS/Users/Login/Index' }).status).toBe(
      'polluted',
    );
    expect(cleanUrl(undefined).status).toBe('missing');
    expect(cleanUrl({ url: '' }).status).toBe('missing');
    expect(cleanUrl('not a url').status).toBe('missing');
  });
  it('repairs junk around the URL and upgrades http', () => {
    const r = cleanUrl(
      'Ver: http://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.1, ',
    );
    expect(r.status).toBe('ok');
    expect(r.url).toBe(
      'https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.1',
    );
  });
});

describe('modality', () => {
  it('maps every observed raw spelling', () => {
    const cases: Array<[string, string]> = [
      ['Contratación directa', 'contratacion-directa'],
      ['Contratación Directa (con ofertas)', 'contratacion-directa'],
      ['Contratación régimen especial', 'regimen-especial'],
      ['Contratación régimen especial (con ofertas)', 'regimen-especial'],
      ['Mínima cuantía', 'minima-cuantia'],
      ['Selección Abreviada de Menor Cuantía', 'seleccion-abreviada-menor-cuantia'],
      [
        'Seleccion Abreviada Menor Cuantia Sin Manifestacion Interes',
        'seleccion-abreviada-menor-cuantia',
      ],
      ['Selección abreviada subasta inversa', 'subasta-inversa'],
      ['Solicitud de información a los Proveedores', 'solicitud-informacion'],
      ['Licitación pública', 'licitacion-publica'],
      ['Licitación pública Obra Publica', 'licitacion-obra'],
      ['Licitación Pública Acuerdo Marco de Precios', 'acuerdo-marco'],
      ['Concurso de méritos abierto', 'concurso-meritos'],
      ['Concurso de méritos con precalificación', 'concurso-meritos'],
      ['Enajenación de bienes con subasta', 'enajenacion'],
      ['Enajenación de bienes con sobre cerrado', 'enajenacion'],
      ['No Definido', 'otro'],
      ['Subasta de prueba', 'otro'],
    ];
    for (const [raw, expected] of cases) expect(canonicalModality(raw), raw).toBe(expected);
    expect(canonicalModality(null)).toBe('otro');
    expect(modalityAcceptsOffers('Contratación Directa (con ofertas)')).toBe(true);
    expect(modalityAcceptsOffers('Contratación directa')).toBe(false);
  });
});

describe('phase / status / unspsc / department', () => {
  it('canonicalises phases across languages and casing', () => {
    expect(canonicalPhase('Presentación de observaciones')).toBe('Presentación de observaciones');
    expect(canonicalPhase('Presentación de Observaciones')).toBe('Presentación de observaciones');
    expect(canonicalPhase('Clarification submission')).toBe('Presentación de observaciones');
    expect(canonicalPhase('Fase de ofertas')).toBe('Presentación de ofertas');
    expect(canonicalPhase('Manifestación de interés (Menor Cuantía)')).toBe(
      'Manifestación de interés',
    );
    expect(canonicalPhase('Estimate Phase')).toBe('Borrador');
    expect(canonicalPhase(null)).toBeNull();
  });
  it('canonicalises statuses', () => {
    expect(canonicalStatus('Publicado')).toBe('publicado');
    expect(canonicalStatus('Evaluación')).toBe('evaluacion');
    expect(canonicalStatus('En aprobación')).toBe('en-aprobacion');
    expect(canonicalStatus('???')).toBe('desconocido');
  });
  it('parses UNSPSC codes', () => {
    expect(parseUnspsc('V1.43233200')).toEqual({
      code: 'V1.43233200',
      segment: '43',
      family: '4323',
    });
    expect(parseUnspsc('UNSPSC')).toEqual({ code: 'UNSPSC', segment: null, family: null });
    expect(parseUnspsc(null)).toEqual({ code: null, segment: null, family: null });
  });
  it('canonicalises departments', () => {
    expect(canonicalDepartment('Distrito Capital de Bogotá')).toEqual({
      code: '11',
      name: 'Bogotá D.C.',
    });
    expect(canonicalDepartment('Antioquia')).toEqual({ code: '05', name: 'Antioquia' });
    expect(canonicalDepartment('San Andrés, Providencia y Santa Catalina')).toEqual({
      code: '88',
      name: 'San Andrés y Providencia',
    });
    expect(canonicalDepartment('Departamento de Nariño')).toEqual({ code: '52', name: 'Nariño' });
    expect(canonicalDepartment('05')).toEqual({ code: '05', name: 'Antioquia' });
    expect(canonicalDepartment('Atlantis')).toEqual({ code: null, name: 'Atlantis' });
    expect(canonicalDepartment(null)).toEqual({ code: null, name: null });
  });
});
