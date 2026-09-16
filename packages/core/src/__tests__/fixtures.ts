import type { Opportunity, RawContratoRow, RawProcesoRow } from '../types';
import { normalizeProcess } from '../normalize/process';

/** Real-shaped row observed on 2026-09-16 (draft, polluted URL). */
export const RAW_DRAFT_ROW: RawProcesoRow = {
  entidad: 'COMANDO GENERAL DE LAS FUERZAS MILITARES',
  nit_entidad: '800230729',
  departamento_entidad: 'Distrito Capital de Bogotá',
  ciudad_entidad: 'Bogotá',
  ordenentidad: 'Nacional',
  codigo_pci: 'Centralizada',
  id_del_proceso: 'CO1.REQ.11035536',
  referencia_del_proceso: '286 COGFM DIADF 2026',
  ppi: '700406036',
  id_del_portafolio: 'CO1.BDOS.10850332',
  nombre_del_procedimiento:
    'REQUIERE ADQUIRIR E INSTALAR UN SISTEMA INTEGRAL DE CONTROL DE ACCESO BIOMÉTRICO CON TECNOLOGÍA DE RECONOCIMIENTO FACIAL',
  descripci_n_del_procedimiento:
    'REQUIERE ADQUIRIR E INSTALAR UN SISTEMA INTEGRAL DE CONTROL DE ACCESO BIOMÉTRICO CON TECNOLOGÍA DE RECONOCIMIENTO FACIAL, INCLUYENDO EL SUMINISTRO DE EQUIPOS, SOFTWARE, SERVIDOR DE ADMINISTRACIÓN',
  precio_base: '110500000',
  modalidad_de_contratacion: 'Mínima cuantía',
  justificaci_n_modalidad_de: 'Presupuesto inferior al 10% de la menor cuantía',
  duracion: '2',
  unidad_de_duracion: 'Mes(es)',
  fecha_de_recepcion_de: '2026-09-18T00:00:00.000',
  fecha_de_apertura_de_respuesta: '2026-09-18T00:00:00.000',
  ciudad_de_la_unidad_de: 'Bogotá',
  proveedores_invitados: '0',
  proveedores_con_invitacion: '0',
  visualizaciones_del: '0',
  proveedores_que_manifestaron: '0',
  respuestas_al_procedimiento: '0',
  respuestas_externas: '0',
  conteo_de_respuestas_a_ofertas: '0',
  proveedores_unicos_con: '0',
  numero_de_lotes: '0',
  estado_del_procedimiento: 'Borrador',
  id_estado_del_procedimiento: '0',
  adjudicado: 'No',
  id_adjudicacion: 'No Adjudicado',
  codigoproveedor: 'No Definido',
  departamento_proveedor: 'No Definido',
  ciudad_proveedor: 'No Definido',
  valor_total_adjudicacion: '0',
  nombre_del_adjudicador: 'No Adjudicado',
  nombre_del_proveedor: 'No Definido',
  nit_del_proveedor_adjudicado: 'No Definido',
  codigo_principal_de_categoria: 'V1.46171621',
  estado_de_apertura_del_proceso: 'Abierto',
  tipo_de_contrato: 'Compraventa',
  subtipo_de_contrato: 'No Definido',
  categorias_adicionales: 'No definido',
  urlproceso: { url: 'https://community.secop.gov.co/STS/Users/Login/Index' },
  codigo_entidad: '700406036',
  estado_resumen: 'No Definido',
};

/** Published row with the good URL (duplicate of the same process). */
export const RAW_PUBLISHED_ROW: RawProcesoRow = {
  entidad: 'SENA REGIONAL ANTIOQUIA Grupo Administrativo CTMAE',
  nit_entidad: '899999034',
  departamento_entidad: 'Antioquia',
  ciudad_entidad: 'Puerto Berrío',
  ordenentidad: 'Nacional',
  codigo_pci: 'Descentralizada',
  id_del_proceso: 'CO1.REQ.11035678',
  referencia_del_proceso: 'SIP-2026-014',
  id_del_portafolio: 'CO1.BDOS.10850100',
  nombre_del_procedimiento: 'Desarrollo de software para gestión de inventarios',
  descripci_n_del_procedimiento:
    'Prestación de servicios profesionales para el desarrollo de software y aplicación móvil de gestión de inventarios del centro',
  fase: 'Presentación de oferta',
  fecha_de_publicacion_del: '2026-09-14T00:00:00.000',
  fecha_de_ultima_publicaci: '2026-09-14T00:00:00.000',
  precio_base: '48000000',
  modalidad_de_contratacion: 'Mínima cuantía',
  duracion: '60',
  unidad_de_duracion: 'día(s)',
  fecha_de_recepcion_de: '2026-09-25T00:00:00.000',
  estado_del_procedimiento: 'Publicado',
  adjudicado: 'No',
  codigo_principal_de_categoria: 'V1.43233200',
  estado_de_apertura_del_proceso: 'Abierto',
  tipo_de_contrato: 'Prestación de servicios',
  urlproceso: {
    url: 'https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.10889582',
  },
  codigo_entidad: '700221021',
  estado_resumen: 'Presentación de oferta',
  proveedores_invitados: '3',
  visualizaciones_del: '12',
};

/** Same process id as RAW_PUBLISHED_ROW but with the polluted URL and no phase. */
export const RAW_PUBLISHED_DUPLICATE: RawProcesoRow = {
  ...RAW_PUBLISHED_ROW,
  fase: undefined,
  urlproceso: { url: 'https://community.secop.gov.co/STS/Users/Login/Index' },
  proveedores_invitados: '0',
  visualizaciones_del: '20',
};

export const RAW_CONTRACT_ROW: RawContratoRow = {
  nombre_entidad: 'UNIDADES TECNOLOGICAS DE SANTANDER',
  nit_entidad: '890208727',
  departamento: 'Santander',
  ciudad: 'Bucaramanga',
  orden: 'Territorial',
  entidad_centralizada: 'Descentralizada',
  proceso_de_compra: 'CO1.BDOS.10796096',
  id_contrato: 'CO1.PCCNTR.9941325',
  referencia_del_contrato: 'CT-2026-001',
  estado_contrato: 'En ejecución',
  codigo_de_categoria_principal: 'V1.43232101',
  descripcion_del_proceso: 'ADQUIRIR LA LICENCIA PERPETUA DEL SOFTWARE DE MODELADO Y DISEÑO',
  tipo_de_contrato: 'Compraventa',
  modalidad_de_contratacion: 'Mínima cuantía',
  fecha_de_firma: '2026-09-14T00:00:00.000',
  fecha_de_inicio_del_contrato: '2026-09-15T00:00:00.000',
  fecha_de_fin_del_contrato: '2026-10-15T00:00:00.000',
  tipodocproveedor: 'NIT',
  documento_proveedor: '805008189',
  proveedor_adjudicado: 'MEGACAD',
  es_pyme: 'Si',
  valor_del_contrato: '4154000',
  urlproceso: {
    url: 'https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.10842717&isFromPublicArea=True',
  },
  objeto_del_contrato: 'ADQUIRIR LA LICENCIA PERPETUA DEL SOFTWARE DE MODELADO RHINOCEROS 8',
};

export function opportunity(overrides: Partial<RawProcesoRow> = {}): Opportunity {
  const r = normalizeProcess({ ...RAW_PUBLISHED_ROW, ...overrides });
  if (!r.ok) throw new Error(`fixture failed: ${r.reason}`);
  return r.value;
}

export const TODAY = '2026-09-16';
