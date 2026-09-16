import { describe, expect, it } from 'vitest';
import { daysLeft, deriveLifecycle } from '../lifecycle';
import { assessRup } from '../rup';
import { opportunity, TODAY } from './fixtures';

describe('deriveLifecycle', () => {
  it('is open while the closing date has not passed', () => {
    expect(
      deriveLifecycle(opportunity({ fecha_de_recepcion_de: '2026-09-25T00:00:00.000' }), TODAY),
    ).toBe('open');
    expect(
      deriveLifecycle(opportunity({ fecha_de_recepcion_de: '2026-09-16T00:00:00.000' }), TODAY),
    ).toBe('open');
    expect(
      deriveLifecycle(opportunity({ fecha_de_recepcion_de: '2026-09-15T00:00:00.000' }), TODAY),
    ).toBe('closed');
  });
  it('ignores the misleading estado_de_apertura_del_proceso column', () => {
    const o = opportunity({
      estado_de_apertura_del_proceso: 'Abierto',
      estado_del_procedimiento: 'Cancelado',
    });
    expect(deriveLifecycle(o, TODAY)).toBe('cancelled');
  });
  it('maps statuses', () => {
    expect(deriveLifecycle(opportunity({ estado_del_procedimiento: 'Borrador' }), TODAY)).toBe(
      'draft',
    );
    expect(deriveLifecycle(opportunity({ estado_del_procedimiento: 'En aprobación' }), TODAY)).toBe(
      'draft',
    );
    expect(deriveLifecycle(opportunity({ estado_del_procedimiento: 'Evaluación' }), TODAY)).toBe(
      'evaluating',
    );
    expect(deriveLifecycle(opportunity({ estado_del_procedimiento: 'Suspendido' }), TODAY)).toBe(
      'suspended',
    );
    expect(deriveLifecycle(opportunity({ estado_del_procedimiento: 'Seleccionado' }), TODAY)).toBe(
      'awarded',
    );
    expect(deriveLifecycle(opportunity({ adjudicado: 'Si' }), TODAY)).toBe('awarded');
  });
  it('treats published processes without closing date as open', () => {
    expect(deriveLifecycle(opportunity({ fecha_de_recepcion_de: undefined }), TODAY)).toBe('open');
    expect(
      deriveLifecycle(
        opportunity({ fecha_de_recepcion_de: undefined, estado_del_procedimiento: '???' }),
        TODAY,
      ),
    ).toBe('closed');
  });
  it('computes days left', () => {
    expect(daysLeft(opportunity({ fecha_de_recepcion_de: '2026-09-25T00:00:00.000' }), TODAY)).toBe(
      9,
    );
    expect(daysLeft(opportunity({ fecha_de_recepcion_de: undefined }), TODAY)).toBeNull();
  });
});

describe('assessRup', () => {
  it('applies the legal exception list by modality', () => {
    expect(
      assessRup(opportunity({ modalidad_de_contratacion: 'Contratación directa' })).requirement,
    ).toBe('not-required');
    expect(
      assessRup(opportunity({ modalidad_de_contratacion: 'Mínima cuantía' })).requirement,
    ).toBe('not-required');
    expect(
      assessRup(opportunity({ modalidad_de_contratacion: 'Enajenación de bienes con subasta' }))
        .requirement,
    ).toBe('not-required');
    expect(
      assessRup(opportunity({ modalidad_de_contratacion: 'Licitación pública' })).requirement,
    ).toBe('required');
    expect(
      assessRup(opportunity({ modalidad_de_contratacion: 'Selección abreviada subasta inversa' }))
        .requirement,
    ).toBe('required');
    expect(
      assessRup(opportunity({ modalidad_de_contratacion: 'Concurso de méritos abierto' }))
        .requirement,
    ).toBe('required');
  });
  it('flags acuerdo marco membership', () => {
    const r = assessRup(
      opportunity({ modalidad_de_contratacion: 'Licitación Pública Acuerdo Marco de Precios' }),
    );
    expect(r.requirement).toBe('required');
    expect(r.notes.length).toBeGreaterThan(0);
  });
  it('marks régimen especial as an inference', () => {
    const r = assessRup(
      opportunity({ modalidad_de_contratacion: 'Contratación régimen especial (con ofertas)' }),
    );
    expect(r.requirement).toBe('likely-not-required');
    expect(r.basis).toBe('inference');
  });
  it('treats RFIs as not applicable and unknown modalities as unknown', () => {
    expect(
      assessRup(
        opportunity({ modalidad_de_contratacion: 'Solicitud de información a los Proveedores' }),
      ).requirement,
    ).toBe('not-applicable');
    expect(assessRup(opportunity({ modalidad_de_contratacion: 'No Definido' })).requirement).toBe(
      'unknown',
    );
  });
  it('exempts concessions and health services even under competitive modalities', () => {
    expect(
      assessRup(
        opportunity({
          modalidad_de_contratacion: 'Licitación pública',
          tipo_de_contrato: 'Concesión',
        }),
      ).requirement,
    ).toBe('not-required');
    const health = assessRup(
      opportunity({
        modalidad_de_contratacion: 'Selección Abreviada de Menor Cuantía',
        codigo_principal_de_categoria: 'V1.85101500',
        nombre_del_procedimiento: 'Prestación de servicios de salud de primer nivel',
        descripci_n_del_procedimiento:
          'Prestación de servicios de salud de primer nivel para la ESE',
      }),
    );
    expect(health.requirement).toBe('not-required');
    expect(health.basis).toBe('inference');
  });
});
