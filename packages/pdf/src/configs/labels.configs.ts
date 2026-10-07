// Default en/pt label pack for @welldot/pdf. Seeded from the profiler app's
// `editor.*` i18n messages; keys mirror those paths without the `editor.`
// prefix (`exportPdfDialog.content.*` became `document.*`).
// Override any leaf through `PdfExportOptions.labels`.

/** One default label: required English and Portuguese text. */
export interface PdfDefaultLabel {
  en: string;
  pt: string;
}

/** Recursive label tree; leaves are {@link PdfDefaultLabel}. */
export interface PdfLabelTree {
  [key: string]: PdfDefaultLabel | PdfLabelTree;
}

/** Default label pack. Leaves are `{ en, pt }`; resolve with `resolvePdfLabels`. */
export const PDF_LABELS = {
  construction: {
    boreHole: {
      diameter: { en: 'Diam.', pt: 'Diâm.' },
      from: { en: 'From', pt: 'De' },
      title: { en: 'Bore Hole', pt: 'Poço (Sondagem)' },
      to: { en: 'To', pt: 'Até' },
    },
    centralizer: {
      diameter: { en: 'Diameter', pt: 'Diâmetro' },
      from: { en: 'From', pt: 'De' },
      spacing: { en: 'Spacing', pt: 'Espaçamento' },
      title: { en: 'Centralizers', pt: 'Centralizadores' },
      to: { en: 'To', pt: 'Até' },
      type: { en: 'Type', pt: 'Tipo' },
    },
    holeFill: {
      description: { en: 'Material/Description', pt: 'Material/Descrição' },
      diameter: { en: 'Diam.', pt: 'Diâm.' },
      from: { en: 'From', pt: 'De' },
      title: { en: 'Hole Fill', pt: 'Espaço Anular' },
      to: { en: 'To', pt: 'Até' },
    },
    reduction: {
      diamFrom: { en: 'Diam. From', pt: 'Diâm. De' },
      diamTo: { en: 'Diam. To', pt: 'Diâm. Até' },
      from: { en: 'From', pt: 'De' },
      title: { en: 'Reduction', pt: 'Redução' },
      to: { en: 'To', pt: 'Até' },
      type: { en: 'Type', pt: 'Tipo' },
    },
    surfaceCase: {
      title: { en: 'Surface Casing', pt: 'Tubo de Boca' },
    },
    wellCase: {
      diameter: { en: 'Diam.', pt: 'Diâm.' },
      from: { en: 'From', pt: 'De' },
      title: { en: 'Casing', pt: 'Revestimento' },
      to: { en: 'To', pt: 'Até' },
      type: { en: 'Type / Material', pt: 'Tipo / Material' },
    },
    wellScreen: {
      diameter: { en: 'Diam.', pt: 'Diâm.' },
      from: { en: 'From', pt: 'De' },
      title: { en: 'Screen', pt: 'Filtro' },
      to: { en: 'To', pt: 'Até' },
      type: { en: 'Type', pt: 'Tipo' },
    },
    wellhead: {
      cementPad: {
        en: 'Sanitary Protection Slab',
        pt: 'Laje de Proteção Sanitária',
      },
      length: { en: 'Length', pt: 'Comprimento' },
      thickness: { en: 'Thickness', pt: 'Espessura' },
      type: { en: 'Type', pt: 'Tipo' },
      width: { en: 'Width', pt: 'Largura' },
    },
  },
  document: {
    title: { en: 'GEOLOGICAL PROFILE', pt: 'PERFIL GEOLÓGICO' },
    footerTagline: {
      en: 'See this profile\nonline',
      pt: 'veja esse perfil\nonline',
    },
    footerTaglineFallback: {
      en: 'See more wells\nonline',
      pt: 'veja mais poços\nonline',
    },
    footerValidUntilLabel: { en: 'Expires', pt: 'Expira' },
    page: { en: 'Page', pt: 'Página' },
    slot: { en: 'Slot', pt: 'Ranhura' },
    total: { en: 'Total', pt: 'Total' },
    volumeTotal: { en: 'Total volume', pt: 'Volume total' },
    finalInfoTitle: { en: 'Final information', pt: 'Informações finais' },
  },
  general: {
    constructionDate: { en: 'Construction Date', pt: 'Data de Construção' },
    coordinates: { en: 'Coordinates', pt: 'Coordenadas' },
    driller: { en: 'Driller', pt: 'Perfurador' },
    elevation: { en: 'Elevation', pt: 'Elevação' },
    generalInfo: { en: 'General Information', pt: 'Informações Gerais' },
    name: { en: 'Well Name', pt: 'Nome do Poço' },
    observationsLabel: { en: 'Observations', pt: 'Observações' },
    wellDepth: { en: 'Well depth', pt: 'Profundidade útil' },
    wellIds: {
      id: { en: 'ID', pt: 'ID' },
      primary: { en: 'Primary', pt: 'Principal' },
    },
    wellPurpose: { en: 'Well Purpose', pt: 'Finalidade do Poço' },
    wellType: { en: 'Well Type', pt: 'Tipo de Poço' },
  },
  historyLog: {
    logs: {
      by: { en: 'by', pt: 'por' },
      title: { en: 'History Logs', pt: 'Registro de Histórico' },
    },
  },
  hydrodynamicEvents: {
    fields: {
      operator: { en: 'Operator', pt: 'Operador' },
    },
    stats: {
      flowRate: { en: 'FLOW RATE Q', pt: 'VAZÃO Q' },
      nd: { en: 'DWL', pt: 'ND' },
      ne: { en: 'SWL', pt: 'NE' },
    },
    title: { en: 'Hydrodynamic Events', pt: 'Eventos Hidrodinâmicos' },
  },
  operation: {
    meter: {
      current: { en: 'Current', pt: 'Atual' },
      fields: {
        manufacturer: { en: 'Manufacturer', pt: 'Fabricante' },
        model: { en: 'Model', pt: 'Modelo' },
        type: { en: 'Meter type', pt: 'Tipo de hidrômetro' },
        serial: { en: 'Serial number', pt: 'Número de série' },
        serialInfo: {
          en: 'A meter removed and reinstalled gets a new entry with the same serial number.',
          pt: 'Um hidrômetro retirado e reinstalado ganha uma nova entrada com o mesmo número de série.',
        },
        installedAt: { en: 'Installed at', pt: 'Instalado em' },
        removedAt: { en: 'Removed at', pt: 'Retirado em' },
        removedAtInfo: {
          en: 'Leave empty while the meter is installed.',
          pt: 'Deixe vazio enquanto o hidrômetro estiver instalado.',
        },
        installedBy: { en: 'Installed by', pt: 'Instalado por' },
        removedBy: { en: 'Removed by', pt: 'Retirado por' },
        nominalDiameter: { en: 'Nominal diameter', pt: 'Diâmetro nominal' },
        nominalDiameterInfo: {
          en: 'Nominal diameter (DN) of the meter.',
          pt: 'Diâmetro nominal (DN) do hidrômetro.',
        },
        maxReading: {
          en: 'Register capacity',
          pt: 'Capacidade do totalizador',
        },
        maxReadingInfo: {
          en: 'Largest value the register shows before rolling over to zero. Used to derive the volume across a rollover.',
          pt: 'Maior valor exibido antes de o totalizador voltar a zero. Usado para calcular o volume após a virada.',
        },
        notes: { en: 'Notes', pt: 'Observações' },
      },
      title: { en: 'Meters', pt: 'Hidrômetros' },
      untyped: { en: 'Meter', pt: 'Hidrômetro' },
    },
    permit: {
      conditions: {
        deadlineStatus: {
          fulfilled: { en: 'Fulfilled', pt: 'Cumprida' },
          fulfilled_late: { en: 'Fulfilled late', pt: 'Cumprida com atraso' },
          upcoming: { en: 'Upcoming', pt: 'A vencer' },
          overdue: { en: 'Overdue', pt: 'Atrasada' },
        },
        responsible: { en: 'Responsible', pt: 'Responsável' },
        title: { en: 'Conditions', pt: 'Condicionantes' },
        undated: { en: 'Undated', pt: 'Sem prazo' },
      },
      fields: {
        type: { en: 'Type', pt: 'Tipo' },
        typeInfo: {
          en: 'A renewal is not a type: create a new permit of the same type that supersedes the previous one.',
          pt: 'Renovação não é um tipo: crie uma nova outorga do mesmo tipo que substitui a anterior.',
        },
        authority: { en: 'Authority', pt: 'Órgão' },
        authorityInfo: {
          en: 'Issuing body, e.g. ANA, SEMAS-PA.',
          pt: 'Órgão emissor, ex.: ANA, SEMAS-PA.',
        },
        status: { en: 'Status', pt: 'Situação' },
        statusInfo: {
          en: 'Administrative situation set by the authority. Leave "Granted" for an issued permit: its validity status is then derived from the dates.',
          pt: 'Situação administrativa definida pelo órgão. Mantenha "Concedida" para uma outorga emitida: a vigência é então derivada das datas.',
        },
        identifier: { en: 'Permit identifier', pt: 'Identificação da outorga' },
        identifierInfo: {
          en: 'Identifier of the granted instrument (portaria, license code…), as written in the document. Empty while the permit is only requested.',
          pt: 'Identificação do ato concedido (portaria, código da licença…), como no documento. Vazia enquanto a outorga está apenas requerida.',
        },
        requestIdentifier: {
          en: 'Request identifier',
          pt: 'Identificação do requerimento',
        },
        requestIdentifierInfo: {
          en: 'Protocol or process identifier of the request, as assigned by the authority.',
          pt: 'Protocolo ou número do processo do requerimento, atribuído pelo órgão.',
        },
        issuedAt: { en: 'Issued at', pt: 'Emitida em' },
        validFrom: { en: 'Valid from', pt: 'Válida a partir de' },
        validFromInfo: {
          en: 'Leave empty when valid from the issue date.',
          pt: 'Deixe vazio quando vale desde a emissão.',
        },
        validUntil: { en: 'Valid until', pt: 'Válida até' },
        validUntilInfo: {
          en: 'Leave empty when there is no fixed expiry.',
          pt: 'Deixe vazio quando não há vencimento.',
        },
        renewalRequestedAt: {
          en: 'Renewal requested at',
          pt: 'Renovação solicitada em',
        },
        renewalRequestedAtInfo: {
          en: 'A renewal filed on or before the expiry keeps the permit active while it is pending.',
          pt: 'Um pedido protocolado até o vencimento mantém a outorga vigente enquanto é analisado.',
        },
        validity: { en: 'Validity', pt: 'Vigência' },
        waterUse: { en: 'Water use', pt: 'Finalidade de uso' },
        waterUseEmpty: {
          en: 'No use selected',
          pt: 'Nenhuma finalidade selecionada',
        },
        waterUseAdd: { en: 'Add use', pt: 'Adicionar finalidade' },
        waterUseEdit: { en: 'Edit', pt: 'Editar' },
        waterUseRemove: { en: 'Remove use', pt: 'Remover finalidade' },
        flowRate: { en: 'Max. flow', pt: 'Vazão máx.' },
        dailyOperatingTime: {
          en: 'Max. daily operation',
          pt: 'Tempo diário máx.',
        },
        volumeLimits: { en: 'Volume limits', pt: 'Limites de volume' },
        volumeLimitsInfo: {
          en: 'Only volumes stated in the document. Volumes implied by flow × time are derived, never stored.',
          pt: 'Somente volumes declarados no documento. Volumes de vazão × tempo são calculados, nunca armazenados.',
        },
        volumePeriods: {
          daily: { en: 'Daily', pt: 'Diário' },
          monthly: { en: 'Monthly', pt: 'Mensal' },
          annual: { en: 'Annual', pt: 'Anual' },
        },
        monthlySchedule: { en: 'Monthly schedule', pt: 'Regime mensal' },
        monthlyScheduleInfo: {
          en: 'When a schedule exists, months left empty have no abstraction granted.',
          pt: 'Quando há regime mensal, meses vazios não têm captação outorgada.',
        },
        month: { en: 'Month', pt: 'Mês' },
        days: { en: 'Days', pt: 'Dias' },
        supersedes: { en: 'Supersedes', pt: 'Substitui' },
        supersedesInfo: {
          en: 'The permit this one legally replaces (renewal).',
          pt: 'A outorga que esta substitui legalmente (renovação).',
        },
        notes: { en: 'Notes', pt: 'Observações' },
      },
      fulfill: {
        deadline: { en: 'Deadline', pt: 'Prazo' },
      },
      history: {
        done: { en: 'Done', pt: 'Concluída' },
        dueDate: { en: 'Due', pt: 'Prazo' },
        title: { en: 'History', pt: 'Histórico' },
      },
      noExpiry: { en: 'no fixed expiry', pt: 'sem vencimento' },
      status: {
        requested: { en: 'Requested', pt: 'Requerida' },
        granted: { en: 'Granted', pt: 'Concedida' },
        suspended: { en: 'Suspended', pt: 'Suspensa' },
        revoked: { en: 'Revoked', pt: 'Revogada' },
        denied: { en: 'Denied', pt: 'Indeferida' },
        withdrawn: { en: 'Withdrawn', pt: 'Desistida' },
        superseded: { en: 'Superseded', pt: 'Substituída' },
        not_yet_valid: { en: 'Not yet valid', pt: 'Ainda não vigente' },
        active: { en: 'Active', pt: 'Vigente' },
        active_pending_renewal: {
          en: 'Renewal pending',
          pt: 'Renovação em análise',
        },
        expired: { en: 'Expired', pt: 'Vencida' },
      },
      title: { en: 'Permits', pt: 'Outorgas' },
    },
    production: {
      annual: { en: 'Annual production', pt: 'Produção anual' },
      correction: { en: 'Correction', pt: 'Correção' },
      fields: {
        type: { en: 'Type', pt: 'Tipo' },
        details: { en: 'Details', pt: 'Detalhes' },
        value: { en: 'Value', pt: 'Valor' },
        meter: { en: 'Meter', pt: 'Hidrômetro' },
        datetime: { en: 'Date / Time', pt: 'Data / Hora' },
        reading: { en: 'Reading', pt: 'Leitura' },
        readingInfo: {
          en: 'Register value. Choose the volume unit in Settings to enter readings of meters that count in liters or gallons — they are stored in m³.',
          pt: 'Valor do totalizador. Escolha a unidade de volume nas Configurações para lançar leituras de hidrômetros em litros ou galões — são armazenadas em m³.',
        },
        source: { en: 'Source', pt: 'Origem' },
        periodStart: { en: 'Period start', pt: 'Início do período' },
        periodEnd: { en: 'Period end', pt: 'Fim do período' },
        volume: { en: 'Volume', pt: 'Volume' },
        method: { en: 'Method', pt: 'Método' },
        methodInfo: {
          en: 'Estimated volumes count only where no meter reading covers the period. Reported volumes (as declared to a regulator) are kept for comparison and never added to the total.',
          pt: 'Volumes estimados só contam onde nenhuma leitura de hidrômetro cobre o período. Volumes declarados (ao órgão gestor) ficam apenas para comparação e nunca somam ao total.',
        },
        notes: { en: 'Notes', pt: 'Observações' },
      },
      ledger: { en: 'Ledger', pt: 'Registro' },
      ofLimit: { en: '% of limit', pt: '% do limite' },
      periods: {
        year: { en: 'Year', pt: 'Ano' },
      },
      retracted: { en: 'Retracted', pt: 'Anulado' },
      title: { en: 'Production', pt: 'Produção' },
      totals: {
        total: { en: 'Total', pt: 'Total' },
        totalInfo: {
          en: 'Metered plus estimated volumes. Meters take precedence over estimates.',
          pt: 'Volumes medidos mais estimados. O hidrômetro tem precedência sobre estimativas.',
        },
        metered: { en: 'Metered', pt: 'Medido' },
        estimated: { en: 'Estimated', pt: 'Estimado' },
        reported: { en: 'Reported', pt: 'Declarado' },
        reportedInfo: {
          en: 'Volumes declared to a regulator, for comparison only.',
          pt: 'Volumes declarados ao órgão gestor, apenas para comparação.',
        },
      },
      types: {
        meter_reading: { en: 'Meter reading', pt: 'Leitura de hidrômetro' },
        declared_volume: { en: 'Declared volume', pt: 'Volume declarado' },
      },
      unknownIntervalsLabel: {
        en: 'Unknown intervals',
        pt: 'Intervalos desconhecidos',
      },
    },
    pump: {
      current: { en: 'Current', pt: 'Atual' },
      fields: {
        type: { en: 'Pump type', pt: 'Tipo de bomba' },
        typeInfo: {
          en: 'Solar is a power source, not a pump type. Free text is allowed.',
          pt: 'Solar é fonte de energia, não tipo de bomba. Texto livre é permitido.',
        },
        powerSource: { en: 'Power source', pt: 'Fonte de energia' },
        installedAt: { en: 'Installed at', pt: 'Instalada em' },
        removedAt: { en: 'Removed at', pt: 'Retirada em' },
        removedAtInfo: {
          en: 'Leave empty while the pump is installed.',
          pt: 'Deixe vazio enquanto a bomba estiver instalada.',
        },
        installedBy: { en: 'Installed by', pt: 'Instalado por' },
        removedBy: { en: 'Removed by', pt: 'Retirado por' },
        manufacturer: { en: 'Manufacturer', pt: 'Fabricante' },
        model: { en: 'Model', pt: 'Modelo' },
        serial: { en: 'Serial number', pt: 'Número de série' },
        serialInfo: {
          en: 'Links reinstallations of the same unit.',
          pt: 'Liga reinstalações da mesma unidade.',
        },
        intakeDepth: { en: 'Intake depth', pt: 'Profundidade do crivo' },
        intakeDepthInfo: {
          en: 'Depth of the pump intake from ground level. The profile draws the pump ending here.',
          pt: 'Profundidade da entrada da bomba a partir do terreno. O perfil desenha a bomba terminando aqui.',
        },
        ratedFlowRate: { en: 'Rated flow', pt: 'Vazão nominal' },
        ratedHead: { en: 'Rated head', pt: 'Altura manométrica' },
        ratedPower: { en: 'Rated power', pt: 'Potência' },
        ratedPowerInfo: {
          en: 'Stored in kW; shown in the unit chosen in Settings. 1 cv = 0.7355 kW · 1 hp = 0.7457 kW.',
          pt: 'Armazenada em kW; exibida na unidade escolhida nas Configurações. 1 cv = 0,7355 kW · 1 hp = 0,7457 kW.',
        },
        stages: { en: 'Stages', pt: 'Estágios' },
        checkValve: { en: 'Check valve', pt: 'Válvula de retenção' },
        riser: { en: 'Riser', pt: 'Edutor' },
        riserDiameter: { en: 'Riser diameter', pt: 'Diâmetro do edutor' },
        riserDiameterInfo: {
          en: 'As-built outer diameter of the riser pipe.',
          pt: 'Diâmetro externo real do tubo edutor.',
        },
        riserMaterial: { en: 'Riser material', pt: 'Material do edutor' },
        electrical: { en: 'Electrical', pt: 'Elétrica' },
        voltage: { en: 'Voltage', pt: 'Tensão' },
        phases: { en: 'Phases', pt: 'Fases' },
        cableSection: { en: 'Cable section', pt: 'Seção do cabo' },
        cableLength: { en: 'Cable length', pt: 'Comprimento do cabo' },
        notes: { en: 'Notes', pt: 'Observações' },
      },
      title: { en: 'Pump installations', pt: 'Instalações de bomba' },
    },
    regime: {
      fields: {
        effectiveFrom: { en: 'Effective from', pt: 'Vigente a partir de' },
        effectiveFromInfo: {
          en: 'Unique within the block. There is no end date: the next regime replaces this one.',
          pt: 'Único no bloco. Não há data de fim: o próximo regime substitui este.',
        },
        flowRate: { en: 'Flow rate', pt: 'Vazão' },
        dailyOperatingTime: { en: 'Daily operation', pt: 'Operação diária' },
        daysPerWeek: { en: 'Days per week', pt: 'Dias por semana' },
        notes: { en: 'Notes', pt: 'Observações' },
      },
      inForce: { en: 'Regime in force', pt: 'Regime vigente' },
      title: { en: 'Operating regime', pt: 'Regime de operação' },
    },
    wellStatuses: {
      active: { en: 'Active', pt: 'Ativo' },
      maintenance: { en: 'Under maintenance', pt: 'Em manutenção' },
      inactive: { en: 'Inactive', pt: 'Paralisado' },
      decommissioned: { en: 'Decommissioned', pt: 'Desativado' },
      abandoned: { en: 'Abandoned', pt: 'Abandonado' },
    },
  },
  waterQuality: {
    correction: { en: 'Correction', pt: 'Retificação' },
    fields: {
      id: { en: 'Sample id', pt: 'Identificador da amostra' },
      idInfo: {
        en: 'Unique within the file. Duplicates, splits, corrections and history logs point to the sample by this id.',
        pt: 'Único no arquivo. Duplicatas, splits, retificações e entradas do histórico apontam para a amostra por este identificador.',
      },
      datetime: { en: 'Collected at', pt: 'Coletada em' },
      sampleType: { en: 'Sample type', pt: 'Tipo de amostra' },
      sampleTypeInfo: {
        en: 'Routine sample or QA/QC sample. Use an x- prefix for other types.',
        pt: 'Amostra de rotina ou de controle de qualidade. Use o prefixo x- para outros tipos.',
      },
      parentSample: { en: 'Original sample', pt: 'Amostra original' },
      parentSampleId: { en: 'Original sample', pt: 'Amostra original' },
      parentSampleInfo: {
        en: 'Required for field duplicates and split samples: the sample they replicate.',
        pt: 'Obrigatória para duplicatas de campo e splits: a amostra que elas replicam.',
      },
      campaign: { en: 'Campaign', pt: 'Campanha' },
      campaignInfo: {
        en: 'Free identifier grouping the samples of one sampling round.',
        pt: 'Identificador livre que agrupa as amostras de uma rodada de amostragem.',
      },
      sequence: { en: 'Sequence', pt: 'Sequência' },
      sequenceInfo: {
        en: 'Orders samples taken at the same instant (e.g. a vertical profile).',
        pt: 'Ordena amostras coletadas no mesmo instante (ex.: perfil vertical).',
      },
      samplingMethod: { en: 'Sampling method', pt: 'Método de amostragem' },
      samplingMethodInfo: {
        en: 'How the well was purged before collection.',
        pt: 'Como o poço foi purgado antes da coleta.',
      },
      samplingPoint: { en: 'Sampling point', pt: 'Ponto de amostragem' },
      device: { en: 'Device', pt: 'Dispositivo' },
      depth: { en: 'Depth', pt: 'Profundidade' },
      interval: { en: 'Interval', pt: 'Intervalo' },
      laboratory: { en: 'Laboratory', pt: 'Laboratório' },
      reportNumber: { en: 'Report no.', pt: 'Nº do laudo' },
      receivedAt: { en: 'Received at', pt: 'Recebida em' },
      receivedTemperature: {
        en: 'Received temperature',
        pt: 'Temperatura de recebimento',
      },
      detectionLimit: { en: 'DL', pt: 'LD' },
      staticLevelEvent: {
        en: 'Static level measurement',
        pt: 'Medição do nível estático',
      },
      staticLevelEventInfo: {
        en: 'Hydrodynamic event holding the water level measured at collection.',
        pt: "Evento hidrodinâmico com o nível d'água medido na coleta.",
      },
      collectedBy: { en: 'Collected by', pt: 'Coletada por' },
      preservation: { en: 'Preservation', pt: 'Preservação' },
      preservationInfo: {
        en: 'Preservation and packaging, free text (e.g. HNO₃ to pH < 2, cooled to 4 °C).',
        pt: 'Preservação e acondicionamento, texto livre (ex.: HNO₃ até pH < 2, refrigerada a 4 °C).',
      },
      chainOfCustody: { en: 'Chain of custody', pt: 'Cadeia de custódia' },
      chainOfCustodyInfo: {
        en: 'Chain of custody form number.',
        pt: 'Número da ficha de cadeia de custódia.',
      },
      notes: { en: 'Notes', pt: 'Observações' },
      attachments: { en: 'Attachments', pt: 'Anexos' },
      results: { en: 'Results', pt: 'Resultados' },
      dateOnly: { en: 'Date only', pt: 'Só a data' },
      yes: { en: 'Yes', pt: 'Sim' },
      no: { en: 'No', pt: 'Não' },
    },
    pdf: {
      title: { en: 'Water quality', pt: 'Qualidade da água' },
      results: { en: 'Results', pt: 'Resultados' },
      parameter: { en: 'Parameter', pt: 'Parâmetro' },
      value: { en: 'Value', pt: 'Valor' },
      unit: { en: 'Unit', pt: 'Unidade' },
      fraction: { en: 'Fraction', pt: 'Fração' },
      measuredIn: { en: 'Measured in', pt: 'Medido em' },
      method: { en: 'Method', pt: 'Método' },
      flags: { en: 'Lab flags', pt: 'Flags do laboratório' },
      validation: { en: 'Validation', pt: 'Validação' },
      exceedances: { en: 'Exceedances', pt: 'Excedências' },
      limitSet: { en: 'Limit set', pt: 'Conjunto de limites' },
    },
    parameters: {
      temperature: { en: 'Temperature', pt: 'Temperatura' },
      ph: { en: 'pH', pt: 'pH' },
      specific_conductance: {
        en: 'Specific conductance at 25 °C',
        pt: 'Condutividade elétrica a 25 °C',
      },
      conductivity_uncompensated: {
        en: 'Electrical conductivity, uncompensated',
        pt: 'Condutividade sem compensação',
      },
      dissolved_oxygen: { en: 'Dissolved oxygen', pt: 'Oxigênio dissolvido' },
      orp: {
        en: 'Oxidation-reduction potential vs. reference electrode',
        pt: 'Potencial redox vs. eletrodo de referência',
      },
      eh: {
        en: 'Redox potential vs. SHE',
        pt: 'Potencial redox corrigido vs. EPH',
      },
      turbidity: {
        en: 'Turbidity, formazin, method unspecified',
        pt: 'Turbidez, formazina sem método identificado',
      },
      turbidity_ntu: {
        en: 'Turbidity, nephelometric white light',
        pt: 'Turbidez nefelométrica, luz branca',
      },
      turbidity_fnu: {
        en: 'Turbidity, nephelometric infrared (ISO 7027)',
        pt: 'Turbidez nefelométrica, infravermelho',
      },
      turbidity_fau: {
        en: 'Turbidity, attenuation (ISO 7027)',
        pt: 'Turbidez por atenuação',
      },
      apparent_color: { en: 'Apparent color', pt: 'Cor aparente' },
      true_color: { en: 'True color', pt: 'Cor verdadeira' },
      odor: { en: 'Odor', pt: 'Odor' },
      taste: { en: 'Taste', pt: 'Gosto' },
      total_dissolved_solids: {
        en: 'Total dissolved solids',
        pt: 'Sólidos totais dissolvidos',
      },
      total_suspended_solids: {
        en: 'Total suspended solids',
        pt: 'Sólidos suspensos totais',
      },
      total_solids: { en: 'Total solids', pt: 'Sólidos totais' },
      free_co2: { en: 'Free carbon dioxide', pt: 'Gás carbônico livre' },
      alkalinity_total_as_caco3: {
        en: 'Total alkalinity as CaCO₃',
        pt: 'Alcalinidade total como CaCO₃',
      },
      alkalinity_bicarbonate_as_caco3: {
        en: 'Bicarbonate alkalinity as CaCO₃',
        pt: 'Alcalinidade de bicarbonatos como CaCO₃',
      },
      alkalinity_carbonate_as_caco3: {
        en: 'Carbonate alkalinity as CaCO₃',
        pt: 'Alcalinidade de carbonatos como CaCO₃',
      },
      alkalinity_hydroxide_as_caco3: {
        en: 'Hydroxide alkalinity as CaCO₃',
        pt: 'Alcalinidade de hidróxidos como CaCO₃',
      },
      acidity_total_as_caco3: {
        en: 'Total acidity as CaCO₃',
        pt: 'Acidez total como CaCO₃',
      },
      hardness_total_as_caco3: {
        en: 'Total hardness as CaCO₃',
        pt: 'Dureza total como CaCO₃',
      },
      hardness_calcium_as_caco3: {
        en: 'Calcium hardness as CaCO₃',
        pt: 'Dureza de cálcio como CaCO₃',
      },
      calcium: { en: 'Calcium', pt: 'Cálcio' },
      magnesium: { en: 'Magnesium', pt: 'Magnésio' },
      sodium: { en: 'Sodium', pt: 'Sódio' },
      potassium: { en: 'Potassium', pt: 'Potássio' },
      bicarbonate: { en: 'Bicarbonate as HCO₃⁻', pt: 'Bicarbonato como HCO₃⁻' },
      carbonate: { en: 'Carbonate as CO₃²⁻', pt: 'Carbonato como CO₃²⁻' },
      chloride: { en: 'Chloride', pt: 'Cloreto' },
      sulfate: { en: 'Sulfate', pt: 'Sulfato' },
      fluoride: { en: 'Fluoride', pt: 'Fluoreto' },
      silica_as_sio2: { en: 'Silica as SiO₂', pt: 'Sílica como SiO₂' },
      nitrate_as_n: { en: 'Nitrate as N', pt: 'Nitrato como N' },
      nitrate_as_no3: { en: 'Nitrate as NO₃⁻', pt: 'Nitrato como NO₃⁻' },
      nitrite_as_n: { en: 'Nitrite as N', pt: 'Nitrito como N' },
      nitrite_as_no2: { en: 'Nitrite as NO₂⁻', pt: 'Nitrito como NO₂⁻' },
      ammonia_as_n: {
        en: 'Ammonia nitrogen as N',
        pt: 'Nitrogênio amoniacal como N',
      },
      ammonia_as_nh3: { en: 'Ammonia as NH₃', pt: 'Amônia como NH₃' },
      kjeldahl_nitrogen_as_n: {
        en: 'Total Kjeldahl nitrogen as N',
        pt: 'Nitrogênio Kjeldahl total como N',
      },
      phosphorus_total_as_p: {
        en: 'Total phosphorus as P',
        pt: 'Fósforo total como P',
      },
      orthophosphate_as_po4: {
        en: 'Orthophosphate as PO₄³⁻',
        pt: 'Ortofosfato como PO₄³⁻',
      },
      total_organic_carbon: {
        en: 'Total organic carbon',
        pt: 'Carbono orgânico total',
      },
      cod: {
        en: 'Chemical oxygen demand',
        pt: 'Demanda química de oxigênio (DQO)',
      },
      bod5: {
        en: 'Biochemical oxygen demand, 5-day',
        pt: 'Demanda bioquímica de oxigênio (DBO₅)',
      },
      total_petroleum_hydrocarbons: {
        en: 'Total petroleum hydrocarbons (range per method)',
        pt: 'Hidrocarbonetos totais de petróleo',
      },
      oil_and_grease: { en: 'Oil and grease', pt: 'Óleos e graxas' },
      free_chlorine: {
        en: 'Free chlorine residual',
        pt: 'Cloro residual livre',
      },
      total_chlorine: {
        en: 'Total chlorine residual',
        pt: 'Cloro residual total',
      },
      ferrous_iron: { en: 'Ferrous iron (Fe²⁺)', pt: 'Ferro ferroso (Fe²⁺)' },
      chromium_hexavalent: {
        en: 'Hexavalent chromium',
        pt: 'Cromo hexavalente',
      },
      cyanide_total_as_cn: {
        en: 'Total cyanide as CN⁻',
        pt: 'Cianeto total como CN⁻',
      },
      cyanide_wad_as_cn: {
        en: 'Weak acid dissociable cyanide as CN⁻',
        pt: 'Cianeto WAD como CN⁻',
      },
      cyanide_free_as_cn: {
        en: 'Free cyanide as CN⁻',
        pt: 'Cianeto livre como CN⁻',
      },
      thiocyanate: { en: 'Thiocyanate', pt: 'Tiocianato' },
      sulfide_total_as_s: {
        en: 'Total sulfide as S',
        pt: 'Sulfeto total como S',
      },
      iron: { en: 'Iron', pt: 'Ferro' },
      manganese: { en: 'Manganese', pt: 'Manganês' },
      aluminum: { en: 'Aluminium', pt: 'Alumínio' },
      antimony: { en: 'Antimony', pt: 'Antimônio' },
      arsenic: { en: 'Arsenic', pt: 'Arsênio' },
      barium: { en: 'Barium', pt: 'Bário' },
      beryllium: { en: 'Beryllium', pt: 'Berílio' },
      boron: { en: 'Boron', pt: 'Boro' },
      cadmium: { en: 'Cadmium', pt: 'Cádmio' },
      chromium: { en: 'Chromium, total', pt: 'Cromo total' },
      cobalt: { en: 'Cobalt', pt: 'Cobalto' },
      copper: { en: 'Copper', pt: 'Cobre' },
      lead: { en: 'Lead', pt: 'Chumbo' },
      lithium: { en: 'Lithium', pt: 'Lítio' },
      mercury: { en: 'Mercury', pt: 'Mercúrio' },
      molybdenum: { en: 'Molybdenum', pt: 'Molibdênio' },
      nickel: { en: 'Nickel', pt: 'Níquel' },
      selenium: { en: 'Selenium', pt: 'Selênio' },
      silver: { en: 'Silver', pt: 'Prata' },
      strontium: { en: 'Strontium', pt: 'Estrôncio' },
      thallium: { en: 'Thallium', pt: 'Tálio' },
      uranium: { en: 'Uranium', pt: 'Urânio' },
      vanadium: { en: 'Vanadium', pt: 'Vanádio' },
      zinc: { en: 'Zinc', pt: 'Zinco' },
      total_coliforms: {
        en: 'Total coliforms in 100 mL',
        pt: 'Coliformes totais em 100 mL',
      },
      total_coliforms_mpn: {
        en: 'Total coliforms, count',
        pt: 'Coliformes totais, contagem',
      },
      total_coliforms_cfu: {
        en: 'Total coliforms, count',
        pt: 'Coliformes totais, contagem',
      },
      e_coli: { en: 'E. coli in 100 mL', pt: 'E. coli em 100 mL' },
      e_coli_mpn: { en: 'E. coli, count', pt: 'E. coli, contagem' },
      e_coli_cfu: { en: 'E. coli, count', pt: 'E. coli, contagem' },
      thermotolerant_coliforms: {
        en: 'Thermotolerant coliforms in 100 mL',
        pt: 'Coliformes termotolerantes em 100 mL',
      },
      thermotolerant_coliforms_mpn: {
        en: 'Thermotolerant coliforms, count',
        pt: 'Coliformes termotolerantes, contagem',
      },
      thermotolerant_coliforms_cfu: {
        en: 'Thermotolerant coliforms, count',
        pt: 'Coliformes termotolerantes, contagem',
      },
      heterotrophic_plate_count: {
        en: 'Heterotrophic plate count',
        pt: 'Bactérias heterotróficas',
      },
      gross_alpha: { en: 'Gross alpha activity', pt: 'Atividade alfa total' },
      gross_beta: { en: 'Gross beta activity', pt: 'Atividade beta total' },
      radium_226: { en: 'Radium-226', pt: 'Rádio-226' },
      radium_228: { en: 'Radium-228', pt: 'Rádio-228' },
      radon_222: { en: 'Radon-222', pt: 'Radônio-222' },
    },
    presence: {
      present: { en: 'present', pt: 'presente' },
      absent: { en: 'absent', pt: 'ausente' },
    },
    qualifiers: {
      lt: { en: '< less than', pt: '< menor que' },
      gt: { en: '> greater than', pt: '> maior que' },
      not_detected: { en: 'Not detected', pt: 'Não detectado' },
      estimated: { en: 'Estimated', pt: 'Estimado' },
    },
    fractions: {
      total: { en: 'Total', pt: 'Total' },
      dissolved: { en: 'Dissolved', pt: 'Dissolvida' },
      suspended: { en: 'Suspended', pt: 'Suspensa' },
    },
    measuredIn: {
      field: { en: 'Field', pt: 'Campo' },
      lab: { en: 'Lab', pt: 'Laboratório' },
    },
    validationStatuses: {
      unvalidated: { en: 'Unvalidated', pt: 'Não validado' },
      validated: { en: 'Validated', pt: 'Validado' },
      qualified: { en: 'Qualified', pt: 'Qualificado' },
      rejected: { en: 'Rejected', pt: 'Rejeitado' },
    },
    groups: {
      physical: { en: 'Physical / field', pt: 'Físico / campo' },
      aggregate: { en: 'Aggregate', pt: 'Agregados' },
      major_ion: { en: 'Major ions', pt: 'Íons maiores' },
      nutrient: { en: 'Nutrients', pt: 'Nutrientes' },
      organic: { en: 'Organic', pt: 'Orgânicos' },
      disinfection: { en: 'Disinfection', pt: 'Desinfecção' },
      mining_redox: { en: 'Mining and redox', pt: 'Mineração e redox' },
      metal: { en: 'Metals / trace', pt: 'Metais / traço' },
      microbiology: { en: 'Microbiology', pt: 'Microbiologia' },
      radioactivity: { en: 'Radioactivity', pt: 'Radioatividade' },
    },
    notDetected: { en: 'not detected', pt: 'não detectado' },
    estimatedShort: { en: 'est.', pt: 'est.' },
  },
} satisfies PdfLabelTree;

/** Shape of {@link PDF_LABELS}. */
export type PdfLabelPack = typeof PDF_LABELS;
