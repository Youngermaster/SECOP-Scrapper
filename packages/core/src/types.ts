/**
 * Domain types shared by the scraper (producer) and the web app (consumer).
 * Everything here is plain JSON-serializable data; derived values that depend on
 * "today" (lifecycle, days left, score, RUP assessment) are computed at load time.
 */

/** Canonical contracting modality (Colombian public procurement). */
export type Modality =
  | 'licitacion-publica'
  | 'licitacion-obra'
  | 'acuerdo-marco'
  | 'seleccion-abreviada-menor-cuantia'
  | 'subasta-inversa'
  | 'concurso-meritos'
  | 'minima-cuantia'
  | 'contratacion-directa'
  | 'regimen-especial'
  | 'solicitud-informacion'
  | 'enajenacion'
  | 'otro';

/** Raw SECOP II process status, canonicalised to a slug. */
export type ProcessStatus =
  | 'publicado'
  | 'abierto'
  | 'evaluacion'
  | 'seleccionado'
  | 'cancelado'
  | 'suspendido'
  | 'borrador'
  | 'en-aprobacion'
  | 'aprobado'
  | 'desconocido';

/** Derived stage of a process relative to a reference date. */
export type Lifecycle =
  'draft' | 'open' | 'evaluating' | 'awarded' | 'cancelled' | 'suspended' | 'closed';

export type UrlStatus = 'ok' | 'polluted' | 'missing';

export type EntityOrder = 'nacional' | 'territorial' | 'corporacion-autonoma' | 'desconocido';

export type DurationUnit = 'dias' | 'semanas' | 'meses' | 'anios' | 'horas' | 'desconocido';

export interface Entity {
  name: string;
  nit: string | null;
  code: string | null;
  order: EntityOrder;
  centralized: boolean | null;
  /** Canonical department display name (e.g. "Bogotá D.C."). */
  department: string | null;
  /** DANE department code, 2 digits (e.g. "05" Antioquia). */
  departmentCode: string | null;
  /** City as reported by SECOP (cleaned, original casing). */
  city: string | null;
}

export interface Duration {
  amount: number;
  unit: DurationUnit;
}

export interface Counters {
  invited: number;
  directInvites: number;
  views: number;
  interested: number;
  responses: number;
  uniqueBidders: number;
}

export interface AwardInfo {
  supplierName: string | null;
  supplierNit: string | null;
  value: number | null;
  /** ISO date YYYY-MM-DD. */
  date: string | null;
}

/** A SECOP II "proceso de contratación" after cleaning. One per `id_del_proceso`. */
export interface Opportunity {
  /** `id_del_proceso`, e.g. "CO1.REQ.11035678". */
  id: string;
  /** `id_del_portafolio`, e.g. "CO1.BDOS.10850332". Joins to Contract.processPortfolioId. */
  portfolioId: string | null;
  reference: string | null;
  entity: Entity;
  title: string;
  description: string;
  phase: string | null;
  status: ProcessStatus;
  statusRaw: string | null;
  modality: Modality;
  modalityRaw: string | null;
  modalityJustification: string | null;
  contractType: string | null;
  contractSubtype: string | null;
  /** UNSPSC code as published, e.g. "V1.43233200". */
  unspscCode: string | null;
  /** First two digits of the UNSPSC code, e.g. "43". */
  unspscSegment: string | null;
  /** First four digits of the UNSPSC code, e.g. "4323". */
  unspscFamily: string | null;
  additionalCategories: string | null;
  /** Estimated value in COP (`precio_base`). Null when absent or zero. */
  value: number | null;
  duration: Duration | null;
  /** ISO dates YYYY-MM-DD (SECOP dates carry no time-of-day). */
  publishedAt: string | null;
  lastPublishedAt: string | null;
  closesAt: string | null;
  responseOpensAt: string | null;
  awarded: boolean;
  award: AwardInfo | null;
  url: string | null;
  urlStatus: UrlStatus;
  counters: Counters;
  lots: number | null;
  /** Lower-cased, accent-stripped haystack for full-text search. */
  searchText: string;
}

/** A SECOP II electronic contract after cleaning. One per `id_contrato`. */
export interface Contract {
  id: string;
  /** `proceso_de_compra`, joins to Opportunity.portfolioId. */
  processPortfolioId: string | null;
  reference: string | null;
  entity: Entity;
  status: string | null;
  unspscCode: string | null;
  unspscSegment: string | null;
  unspscFamily: string | null;
  description: string;
  object: string;
  contractType: string | null;
  modality: Modality;
  modalityRaw: string | null;
  /** ISO dates YYYY-MM-DD. */
  signedAt: string | null;
  startsAt: string | null;
  endsAt: string | null;
  supplier: {
    name: string | null;
    docType: string | null;
    doc: string | null;
    isPyme: boolean | null;
  };
  value: number | null;
  url: string | null;
  urlStatus: UrlStatus;
  searchText: string;
}

export interface Department {
  /** DANE code, 2 digits. */
  code: string;
  name: string;
  lat: number | null;
  lon: number | null;
}

export interface Municipality {
  /** DANE code, 5 digits. */
  code: string;
  name: string;
  /** Accent-stripped upper-case name for matching. */
  key: string;
  departmentCode: string;
  lat: number;
  lon: number;
}

/** Geo lookup tables exported by the scraper. */
export interface GeoData {
  departments: Department[];
  municipalities: Municipality[];
}

/** `manifest.json` describing the exported dataset. */
export interface DatasetManifest {
  schemaVersion: number;
  generatedAt: string;
  counts: {
    opportunities: number;
    contracts: number;
    municipalities: number;
  };
  window: {
    closingSince: string | null;
    publishedFrom: string | null;
    publishedTo: string | null;
    contractsSince: string | null;
  };
  filters: {
    departments: string[];
    keywords: string[];
    modalities: string[];
    categories: string[];
  };
  source: {
    domain: string;
    processesDataset: string;
    contractsDataset: string;
  };
  /** Artifact file names relative to the manifest. `.gz` files are gzip-compressed JSON. */
  files: {
    opportunities: string;
    contracts: string;
    geo: string;
  };
}

/* ------------------------------------------------------------------------- */
/* Raw Socrata rows (the shapes the API actually returns, all optional text). */
/* ------------------------------------------------------------------------- */

export interface RawSocrataUrl {
  url?: string;
  description?: string;
}

/** SECOP II – Procesos de Contratación (p6dx-8zbt). Field names verified 2026-09-16. */
export interface RawProcesoRow {
  entidad?: string;
  nit_entidad?: string;
  departamento_entidad?: string;
  ciudad_entidad?: string;
  ordenentidad?: string;
  codigo_pci?: string;
  id_del_proceso?: string;
  referencia_del_proceso?: string;
  ppi?: string;
  id_del_portafolio?: string;
  nombre_del_procedimiento?: string;
  descripci_n_del_procedimiento?: string;
  fase?: string;
  fecha_de_publicacion_del?: string;
  fecha_de_ultima_publicaci?: string;
  fecha_de_publicacion_fase?: string;
  fecha_de_publicacion_fase_1?: string;
  fecha_de_publicacion?: string;
  fecha_de_publicacion_fase_2?: string;
  fecha_de_publicacion_fase_3?: string;
  precio_base?: string;
  modalidad_de_contratacion?: string;
  justificaci_n_modalidad_de?: string;
  duracion?: string;
  unidad_de_duracion?: string;
  fecha_de_recepcion_de?: string;
  fecha_de_apertura_de_respuesta?: string;
  fecha_de_apertura_efectiva?: string;
  ciudad_de_la_unidad_de?: string;
  nombre_de_la_unidad_de?: string;
  proveedores_invitados?: string;
  proveedores_con_invitacion?: string;
  visualizaciones_del?: string;
  proveedores_que_manifestaron?: string;
  respuestas_al_procedimiento?: string;
  respuestas_externas?: string;
  conteo_de_respuestas_a_ofertas?: string;
  proveedores_unicos_con?: string;
  numero_de_lotes?: string;
  estado_del_procedimiento?: string;
  id_estado_del_procedimiento?: string;
  adjudicado?: string;
  id_adjudicacion?: string;
  codigoproveedor?: string;
  departamento_proveedor?: string;
  ciudad_proveedor?: string;
  fecha_adjudicacion?: string;
  valor_total_adjudicacion?: string;
  nombre_del_adjudicador?: string;
  nombre_del_proveedor?: string;
  nit_del_proveedor_adjudicado?: string;
  codigo_principal_de_categoria?: string;
  estado_de_apertura_del_proceso?: string;
  tipo_de_contrato?: string;
  subtipo_de_contrato?: string;
  categorias_adicionales?: string;
  urlproceso?: RawSocrataUrl | string;
  codigo_entidad?: string;
  estado_resumen?: string;
}

/** SECOP II – Contratos Electrónicos (jbjy-vk9h). Only the fields we consume. */
export interface RawContratoRow {
  nombre_entidad?: string;
  nit_entidad?: string;
  departamento?: string;
  ciudad?: string;
  localizaci_n?: string;
  orden?: string;
  sector?: string;
  rama?: string;
  entidad_centralizada?: string;
  proceso_de_compra?: string;
  id_contrato?: string;
  referencia_del_contrato?: string;
  estado_contrato?: string;
  codigo_de_categoria_principal?: string;
  descripcion_del_proceso?: string;
  tipo_de_contrato?: string;
  modalidad_de_contratacion?: string;
  justificacion_modalidad_de?: string;
  fecha_de_firma?: string;
  fecha_de_inicio_del_contrato?: string;
  fecha_de_fin_del_contrato?: string;
  tipodocproveedor?: string;
  documento_proveedor?: string;
  proveedor_adjudicado?: string;
  es_grupo?: string;
  es_pyme?: string;
  valor_del_contrato?: string;
  urlproceso?: RawSocrataUrl | string;
  ultima_actualizacion?: string;
  codigo_entidad?: string;
  codigo_proveedor?: string;
  objeto_del_contrato?: string;
  duraci_n_del_contrato?: string;
}

/** DIVIPOLA – Códigos municipios (gdxc-w37w). */
export interface RawMunicipioRow {
  cod_dpto?: string;
  dpto?: string;
  cod_mpio?: string;
  nom_mpio?: string;
  tipo_municipio?: string;
  longitud?: string;
  latitud?: string;
}

/** DIVIPOLA – Códigos departamentos (vcjz-niiq). */
export interface RawDepartamentoRow {
  codigo_departamento?: string;
  nombre_departamento?: string;
  longitud?: string;
  latitud?: string;
}
