<script setup lang="ts">
definePageMeta({ layout: 'landing' });

// ── Section data ────────────────────────────────────────────────────────────

const formatProps = [
  {
    num: '§ 1.1',
    title: 'Visualização',
    body: 'Biblioteca livre em D3.js para renderizar e exportar perfis geológicos e construtivos em escala real.',
  },
  {
    num: '§ 1.2',
    title: 'Registro',
    body: 'Estrutura previsível para arquivar e versionar dados de poços, prontos para submissão e auditoria.',
  },
  {
    num: '§ 1.3',
    title: 'Pesquisa',
    body: 'Campos métricos e organizados permitem cruzar e comparar poços entre aquíferos, regiões e épocas.',
  },
  {
    num: '§ 1.4',
    title: 'Aberto',
    body: 'JSON legível por humanos, especificação pública e licença permissiva — livre para usar, estender e contribuir.',
  },
];

const pillars = [
  {
    icon: '⊙',
    title: 'Editor ao vivo',
    body: 'Tabelas ligadas ao desenho. Edite uma camada, veja o perfil redesenhado em escala real.',
  },
  {
    icon: '{ }',
    title: 'Formato aberto',
    body: 'JSON legível, especificação pública e licença Apache 2.0. Implemente em qualquer linguagem.',
  },
  {
    icon: 'A4',
    title: 'Submissão pronta',
    body: 'PDFs A4 em escala real, com cabeçalho, metadados e desenho multipágina.',
  },
];

const ctxCards = [
  { icon: '📁', title: 'Pastas & arquivos', meta: 'p4-exemplo.well · 12 KB' },
  {
    icon: 'git',
    iconStyle: 'font-family: var(--font-mono); font-size: 13px;',
    title: 'Versionado',
    meta: 'commit 9fa2d1d · main',
  },
  {
    icon: 'SQL',
    iconStyle: 'font-family: var(--font-mono); font-size: 10px;',
    title: 'Banco de dados',
    meta: 'JSONB · documentos · índices',
  },
  {
    icon: '✨',
    title: 'Modelos de IA',
    meta: 'legível → sem parser proprietário',
  },
  {
    icon: '⊕',
    iconStyle:
      'background: linear-gradient(135deg, var(--w-primary-500), oklch(58% 0.15 235)); color: white;',
    title: 'welldot.skill',
    meta: 'github.com/rafaeelneto/welldot',
    highlight: true,
  },
];

const horizonProps = [
  {
    num: '§ 4.1',
    title: '.las nativo',
    body: 'Importação e armazenamento de perfis elétricos LAS, lado a lado com o perfil litológico.',
  },
  {
    num: '§ 4.2',
    title: 'Testes de bombeamento',
    body: 'Pump tests, recuperação, vazão específica e parâmetros hidrodinâmicos como séries temporais.',
  },
  {
    num: '§ 4.3',
    title: 'Histórico operacional',
    body: 'Log de eventos: manutenções, troca de bomba, nível estático, paradas — datados e atribuíveis.',
  },
  {
    num: '§ 4.4',
    title: 'Qualidade da água',
    body: 'Análises físico-químicas e bacteriológicas vinculadas à amostragem, profundidade e data.',
  },
  {
    num: '§ 4.5',
    title: 'Metadados estendidos',
    body: 'Outorga, proprietário, regime de uso, referências cadastrais e vínculos com bases regulatórias.',
  },
  {
    num: '§ 4.6',
    title: 'Extensões da comunidade',
    body: 'Namespaces para campos específicos de órgãos e regiões, sem quebrar o núcleo padronizado.',
  },
];

// ── Hero JSON card ──────────────────────────────────────────────────────────

const sampleWell = {
  version: 1,
  name: 'PP-01',
  well_type: 'tubular',
  lat: -1.4558,
  lng: -48.5039,
  bore_hole: [{ from: 0, to: 80, diameter: 250 }],
  well_case: [{ from: 0, to: 60, type: 'steel', diameter: 200 }],
  well_screen: [
    { from: 60, to: 80, type: 'wire_wound', diameter: 150, slot_mm: 0.5 },
  ],
  lithology: [
    { from: 0, to: 20, color: '#f5deb3', fgdc_texture: '612' },
    { from: 20, to: 80, color: '#7a8a6a', fgdc_texture: '616' },
  ],
};

function hi(obj: unknown, depth = 0, indent = '  '): string {
  const pad = indent.repeat(depth);
  if (Array.isArray(obj)) {
    if (!obj.length) return '<span class="tk-p">[]</span>';
    return (
      `<span class="tk-p">[</span>\n` +
      obj
        .map(x => `${pad}${indent}${hi(x, depth + 1, indent)}`)
        .join('<span class="tk-p">,</span>\n') +
      `\n${pad}<span class="tk-p">]</span>`
    );
  }
  if (obj !== null && typeof obj === 'object') {
    const entries = Object.entries(obj as Record<string, unknown>);
    return (
      `<span class="tk-p">{</span>\n` +
      entries
        .map(
          ([k, v]) =>
            `${pad}${indent}<span class="tk-k">${k}</span><span class="tk-p">:</span> ${hi(v, depth + 1, indent)}`,
        )
        .join('<span class="tk-p">,</span>\n') +
      `\n${pad}<span class="tk-p">}</span>`
    );
  }
  if (typeof obj === 'string') return `<span class="tk-s">"${obj}"</span>`;
  if (typeof obj === 'number') return `<span class="tk-n">${obj}</span>`;
  return String(obj);
}

const jsonHtml = computed(() => hi(sampleWell));
</script>

<template>
  <!-- ── Hero ─────────────────────────────────────────────────────────────── -->
  <section
    class="relative pt-8 pb-7 lg:pt-16 lg:pb-14 border-b border-surface-200/60 overflow-hidden"
  >
    <div
      class="absolute inset-0 pointer-events-none"
      style="
        background:
          radial-gradient(
            420px 320px at 78% 50%,
            oklch(70% 0.14 235 / 0.18),
            transparent 70%
          ),
          radial-gradient(
            360px 260px at 8% 90%,
            oklch(72% 0.13 40 / 0.14),
            transparent 70%
          );
      "
    />

    <div class="container-landing relative lg:grid lg:grid-cols-2 lg:gap-14 lg:items-center">
      <!-- Content -->
      <div>
        <div
          class="font-mono text-[11px] tracking-[0.12em] uppercase text-content-500 mb-[18px]"
        >
          .well · formato aberto
        </div>
        <h1
          class="font-serif font-medium text-[44px] lg:text-[76px] leading-none tracking-[-0.025em] mb-[14px] lg:mb-[22px] text-balance"
        >
          Perfis de poços, em <em class="text-primary-500">arquivo aberto</em>.
        </h1>
        <p
          class="text-[15px] lg:text-[19px] leading-[1.55] text-content-400 lg:max-w-[480px] mb-5 lg:mb-7"
        >
          Editor livre para criar, visualizar e exportar perfis geológicos e
          construtivos. Um JSON simples, versionado, legível por qualquer
          linguagem.
        </p>
        <div class="flex flex-col sm:flex-row gap-2.5 mb-5 lg:mb-7">
          <Button label="Abrir editor →" as="a" href="#" />
          <Button label="Ver especificação" as="a" href="#" variant="outlined" severity="secondary" />
        </div>
        <div
          class="flex flex-wrap gap-[22px] pt-5 border-t border-surface-200 font-mono text-[11px] text-content-500 tracking-[0.04em]"
        >
          <span><b class="text-content-0 font-medium">v1.0</b> spec</span>
          <span
            ><b class="text-content-0 font-medium">Apache 2.0</b> licença</span
          >
          <span><b class="text-content-0 font-medium">welldot.org</b></span>
        </div>
      </div>

      <!-- Live editor card (no SVG rendering) -->
      <div
        class="glass rounded-2xl overflow-hidden mt-7 lg:mt-0"
        style="display: grid; grid-template-rows: 36px 1fr"
      >
        <!-- Header bar -->
        <div
          class="live-head-bg flex items-center gap-2 px-3 font-mono text-[11px] text-content-500 border-b border-surface-200"
        >
          <div class="flex gap-1">
            <span class="w-[9px] h-[9px] rounded-full bg-surface-300" />
            <span class="w-[9px] h-[9px] rounded-full bg-surface-300" />
            <span class="w-[9px] h-[9px] rounded-full bg-surface-300" />
          </div>
          <span class="text-content-0 font-medium">PP-01.well</span>
          <span class="flex-1" />
          <span
            class="px-2 py-0.5 text-[10px] bg-primary-50 text-primary-500 rounded-[4px] font-mono"
            >v1.0</span
          >
        </div>
        <!-- Body: JSON pane + render placeholder -->
        <div
          class="min-h-[260px] lg:min-h-[460px]"
          style="display: grid; grid-template-columns: 40fr 60fr"
        >
          <!-- JSON pane -->
          <div
            class="border-r border-surface-200 p-3.5 font-mono text-[11.5px] leading-[1.65] overflow-auto bg-surface-0"
          >
            <!-- eslint-disable-next-line vue/no-v-html -->
            <pre class="m-0 whitespace-pre" v-html="jsonHtml" />
          </div>
          <!-- Render placeholder -->
          <div class="live-render-bg p-3.5 flex flex-col">
            <div
              class="font-mono text-[9px] tracking-[0.1em] uppercase text-content-500 mb-2 flex justify-between"
            >
              <span>Fig. perfil</span>
            </div>
            <div class="flex-1 flex items-center justify-center">
              <div class="text-center opacity-40">
                <div
                  class="w-10 mx-auto mb-3 rounded border border-primary-200 bg-gradient-to-b from-primary-50 to-surface-100"
                  style="height: 120px"
                />
                <p
                  class="font-mono text-[9px] tracking-widest uppercase text-content-500"
                >
                  render · em breve
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- ── §I · Um JSON. Três propósitos. ───────────────────────────────────── -->
  <section
    class="relative py-14 lg:py-20 border-b border-surface-200/60 overflow-hidden"
  >
    <div
      class="absolute inset-0 pointer-events-none"
      style="
        background: radial-gradient(
          700px 400px at 100% 100%,
          oklch(72% 0.13 235 / 0.1),
          transparent 70%
        );
      "
    />
    <div class="container-landing relative">
      <div class="kicker mb-[18px]">I · O formato</div>
      <h2
        class="font-serif font-medium text-[38px] lg:text-[60px] leading-none tracking-[-0.025em] mb-[14px]"
      >
        Um JSON.<br /><em class="text-primary-500">Três</em> propósitos.
      </h2>
      <p
        class="text-[15px] lg:text-[17px] leading-[1.55] text-content-400 lg:max-w-[480px] mb-8"
      >
        Hoje, dados de poços vivem em PDFs que não se conversam entre si. O
        arquivo <b>.well</b> é um formato simples e versionado para mudar isso —
        um único JSON que descreve o poço por inteiro, pensado como
        <em>padrão internacional</em>.
      </p>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <LandingPropCard
          v-for="prop in formatProps"
          :key="prop.num"
          :num="prop.num"
          :title="prop.title"
        >
          <!-- eslint-disable-next-line vue/no-v-html -->
          <span v-html="prop.body" />
        </LandingPropCard>
      </div>
    </div>
  </section>

  <!-- ── §II · Manifesto ──────────────────────────────────────────────────── -->
  <section
    class="manifesto-bg relative py-14 lg:py-20 border-b border-surface-200/60 overflow-hidden"
  >
    <div
      class="absolute right-[-100px] top-[30%] w-[500px] h-[500px] pointer-events-none rounded-full"
      style="
        background: radial-gradient(
          closest-side,
          oklch(72% 0.13 235 / 0.18),
          transparent
        );
      "
    />
    <div class="container-landing relative">
      <div class="kicker mb-3.5">II · Intenção</div>
      <p
        class="font-serif text-[19px] lg:text-[26px] leading-[1.45] max-w-[880px] mb-9 font-normal text-content-0"
      >
        Hoje, o dado de um poço d'água existe em muitos lugares: no caderno do
        perfurador, na planilha do consultor, no PDF do relatório entregue ao
        órgão licenciador. Cada um em seu formato, cada um
        <em class="text-primary-500">ilegível para o outro</em>. O
        <b>welldot</b> e o formato <b>.well</b> foram criados para resolver
        isso.
      </p>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
        <LandingPillarCard
          v-for="pillar in pillars"
          :key="pillar.title"
          :icon="pillar.icon"
          :title="pillar.title"
        >
          {{ pillar.body }}
        </LandingPillarCard>
      </div>
    </div>
  </section>

  <!-- ── §III · Padrão por dentro, flexível por fora. ─────────────────────── -->
  <section
    class="relative py-14 lg:py-20 border-b border-surface-200/60 overflow-hidden"
  >
    <div
      class="absolute inset-0 pointer-events-none"
      style="
        background: radial-gradient(
          700px 400px at 100% 100%,
          oklch(72% 0.13 235 / 0.1),
          transparent 70%
        );
      "
    />
    <div class="container-landing relative lg:grid lg:grid-cols-2 lg:gap-14">
      <!-- Text col -->
      <div>
        <div class="kicker mb-[18px]">III · Um arquivo, muitos contextos</div>
        <h2
          class="font-serif font-medium text-[38px] lg:text-[60px] leading-none tracking-[-0.025em] mb-3.5"
        >
          Padrão por dentro,<br /><em class="text-primary-500">flexível</em> por
          fora.
        </h2>
        <p class="text-[15px] leading-[1.55] text-content-400 mb-3.5">
          Um único arquivo serve a múltiplos contextos: pode ser
          <em>guardado em pastas</em>, versionado em git, indexado em
          <em>bancos de dados</em> relacionais ou documentais, e — por ser texto
          legível com especificação pública —
          <em>analisado por modelos de IA</em> sem necessidade de parsers
          proprietários.
        </p>
        <p class="text-[15px] leading-[1.55] text-content-400 mb-3.5">
          Padronização internacional por padrão: <b>SI</b> em toda parte, chaves
          em inglês, coordenadas <b>WGS84</b> em graus decimais. O núcleo é
          rígido onde precisa ser comparável; o resto permanece
          <em>flexível</em>.
        </p>
        <p
          class="text-[15px] lg:text-[18px] leading-[1.55] text-content-400 mb-6 lg:mb-0"
        >
          Para conversar com modelos de IA, o repositório traz uma
          <b>skill</b> pronta — basta apontar o agente para
          <code
            class="font-mono text-[0.92em] bg-black/[0.04] px-1.5 py-0.5 rounded"
            >github.com/rafaeelneto/welldot</code
          >
          e ele opera o formato sem prompt extra.
        </p>
      </div>
      <!-- Context stack -->
      <div class="flex flex-col gap-2.5 lg:self-start">
        <LandingCtxCard
          v-for="card in ctxCards"
          :key="card.title"
          :icon="card.icon"
          :icon-style="card.iconStyle"
          :title="card.title"
          :meta="card.meta"
          :highlight="card.highlight"
        />
      </div>
    </div>
  </section>

  <!-- ── §IV · No horizonte ────────────────────────────────────────────────── -->
  <section
    class="relative py-14 lg:py-20 border-b border-surface-200/60 overflow-hidden"
  >
    <div
      class="absolute inset-0 pointer-events-none"
      style="
        background: radial-gradient(
          700px 400px at 100% 100%,
          oklch(72% 0.13 235 / 0.1),
          transparent 70%
        );
      "
    />
    <div class="container-landing relative">
      <div class="kicker mb-[18px]">IV · No horizonte</div>
      <h2
        class="font-serif font-medium text-[38px] lg:text-[60px] leading-none tracking-[-0.025em] mb-3.5"
      >
        O <em class="text-primary-500">futuro</em>.
      </h2>
      <p
        class="text-[15px] lg:text-[17px] leading-[1.55] text-content-400 lg:max-w-[480px] mb-8"
      >
        A v1 cobre perfil geológico e construtivo. A especificação evolui de
        forma aberta para abraçar todo o ciclo de vida de um poço.
      </p>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <LandingPropCard
          v-for="prop in horizonProps"
          :key="prop.num"
          :num="prop.num"
          :title="prop.title"
        >
          <!-- eslint-disable-next-line vue/no-v-html -->
          <span v-html="prop.body" />
        </LandingPropCard>
      </div>
    </div>
  </section>

  <!-- ── Final CTA ─────────────────────────────────────────────────────────── -->
  <section
    class="relative py-18 lg:py-27.5 text-center border-b border-surface-200/60 overflow-hidden"
  >
    <div
      class="absolute inset-0 pointer-events-none"
      style="
        background:
          radial-gradient(
            700px 400px at 50% 0%,
            oklch(70% 0.14 235 / 0.16),
            transparent 70%
          ),
          radial-gradient(
            500px 300px at 50% 100%,
            oklch(72% 0.13 40 / 0.1),
            transparent 70%
          );
      "
    />
    <div class="container-landing relative">
      <h2
        class="font-serif font-medium text-[40px] lg:text-[64px] leading-[1.05] tracking-[-0.025em] mb-3.5 text-balance"
      >
        Tudo sobre um poço,<br /><em class="text-primary-500"
          >registrado de uma vez</em
        >.
      </h2>
      <p
        class="text-[14px] lg:text-[18px] text-content-400 max-w-[540px] mx-auto mb-7"
      >
        Livre para usar. Livre para implementar. Aberto para sempre.
      </p>
      <div
        class="flex flex-col sm:flex-row gap-2.5 justify-center items-center"
      >
        <Button label="Abrir editor" as="a" href="#" />
        <Button label="github.com/rafaeelneto/welldot" as="a" href="https://github.com/rafaeelneto/welldot" target="_blank" variant="outlined" severity="secondary" />
      </div>
    </div>
  </section>
</template>
