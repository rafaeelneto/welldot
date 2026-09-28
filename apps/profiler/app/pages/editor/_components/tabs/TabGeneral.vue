<script setup lang="ts">
import AppChip from '~/components/AppChip.vue';
import FormField from '~/components/FormField.vue';

const { t } = useI18n();
const profileStore = useProfileStore();

const constructionDate = computed({
  get: () =>
    profileStore.well.construction_date
      ? new Date(profileStore.well.construction_date)
      : null,
  set: value =>
    (profileStore.well.construction_date = value
      ? value.toISOString().split('T')[0]
      : undefined),
});

const location = computed(() => ({
  lat: profileStore.well.location?.lat ?? 0,
  lng: profileStore.well.location?.lng ?? 0,
  elevation: profileStore.well.location?.elevation ?? 0,
  ...profileStore.well.location,
}));

async function updateLocationField<K extends 'lat' | 'lng' | 'elevation'>(
  key: K,
  newValue: number,
) {
  if (!profileStore.well.location) {
    profileStore.well.location = { lat: 0, lng: 0, elevation: 0 };
  }
  profileStore.well.location[key] = newValue;
}

// ─── Well IDs ─────────────────────────────────────────────────────────────────

const AUTHORITY_SUGGESTIONS = [
  'SIAGAS',
  'ANA',
  'SEMAS/PA',
  'CPRM',
  'IBGE',
  'FUNASA',
  'INEMA',
  'NGWD',
];

const primaryIndex = computed(
  () => profileStore.well.well_id?.findIndex(e => e.primary) ?? -1,
);

function addWellId() {
  if (!profileStore.well.well_id) profileStore.well.well_id = [];
  profileStore.well.well_id.push({ authority: '', id: '' });
}

function deleteWellId(index: number) {
  profileStore.well.well_id?.splice(index, 1);
}

function setPrimary(index: number) {
  if (!profileStore.well.well_id) return;
  const isAlreadyPrimary = primaryIndex.value === index;
  profileStore.well.well_id.forEach((entry, i) => {
    entry.primary = !isAlreadyPrimary && i === index ? true : undefined;
  });
}

// ─── Well type Select ─────────────────────────────────────────────────────────

// Deprecated values (e.g. `artesian`) are never offered, but stay visible as
// an option while the loaded well still uses one, so the Select shows it.
const wellTypeOptions = computed(() => {
  const current = profileStore.well.well_type;
  const values: string[] = [...WELL_TYPE_VALUES];
  if (current && isDeprecatedWellType(current)) values.push(current);
  return values.map(value => ({
    label: resolveWellTypeLabel(value, t),
    value,
  }));
});

const hasDeprecatedWellType = computed(() =>
  isDeprecatedWellType(profileStore.well.well_type),
);

// ─── Well purpose checkboxes ──────────────────────────────────────────────────

const wellPurposeOptions = computed(() => {
  // Keep non-canonical values (e.g. `x-` prefixed) from loaded files visible.
  const extra = (profileStore.well.well_purpose ?? []).filter(
    v => !(WELL_PURPOSE_VALUES as readonly string[]).includes(v),
  );
  return [...WELL_PURPOSE_VALUES, ...extra].map(value => ({
    label: resolveWellPurposeLabel(value, t),
    value,
  }));
});

const wellPurpose = computed({
  get: () => profileStore.well.well_purpose ?? [],
  set: (value: string[]) =>
    (profileStore.well.well_purpose = value.length ? value : undefined),
});

const selectedWellPurposes = computed(() =>
  wellPurposeOptions.value.filter(option =>
    wellPurpose.value.includes(option.value),
  ),
);

const wellPurposePopover = ref();

function removeWellPurpose(value: string) {
  wellPurpose.value = wellPurpose.value.filter(v => v !== value);
}
</script>

<template>
  <div class="flex flex-col gap-8 p-6 lg:p-8">
    <!-- ── Section: General Information ──────────────────────────────────── -->
    <section class="flex flex-col gap-5">
      <div class="flex items-baseline justify-between">
        <h3
          class="font-serif text-[22px] font-medium tracking-[-0.015em] text-content-0 m-0"
        >
          {{ t('editor.general.generalInfo') }}
        </h3>
        <span
          class="font-mono text-[10px] tracking-[0.08em] uppercase text-content-500"
        >
          {{ t('editor.general.metadata') }} · {{ t('editor.well') }}
        </span>
      </div>

      <!-- Name -->
      <FormField :label="t('editor.general.name')">
        <InputText v-model="profileStore.well.name" class="w-full" />
      </FormField>

      <!-- Driller + Construction Date -->
      <div class="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-4">
        <FormField :label="t('editor.general.driller')">
          <InputText v-model="profileStore.well.well_driller" class="w-full" />
        </FormField>
        <FormField :label="t('editor.general.constructionDate')">
          <DatePicker
            v-model="constructionDate"
            show-button-bar
            date-format="dd/mm/yy"
            class="w-full"
            :pt="{ pcInput: { root: 'font-mono text-sm w-full' } }"
          />
        </FormField>
      </div>

      <!-- Well Type (half-width) -->
      <div class="grid sm:grid-cols-2 gap-4">
        <FormField
          :label="t('editor.general.wellType')"
          :info="t('editor.general.wellTypeInfo')"
        >
          <Select
            v-model="profileStore.well.well_type"
            :options="wellTypeOptions"
            option-label="label"
            option-value="value"
            :placeholder="t('editor.general.wellType')"
            class="w-full"
          />
        </FormField>
      </div>

      <!-- Well Purpose -->
      <FormField :label="t('editor.general.wellPurpose')">
        <div class="flex flex-wrap items-center gap-2 pt-1">
          <AppChip
            v-for="option in selectedWellPurposes"
            :key="option.value"
            :label="option.label"
            removable
            :remove-label="t('editor.general.wellPurposeRemove')"
            @remove="removeWellPurpose(option.value)"
          />
          <span
            v-if="!selectedWellPurposes.length"
            class="text-sm text-content-400 italic"
          >
            {{ t('editor.general.wellPurposeEmpty') }}
          </span>
          <Button
            :label="
              selectedWellPurposes.length
                ? t('editor.general.wellPurposeEdit')
                : t('editor.general.wellPurposeAdd')
            "
            severity="secondary"
            size="small"
            text
            @click="wellPurposePopover?.toggle($event)"
          >
            <template #icon>
              <Icon
                :name="
                  selectedWellPurposes.length ? 'ph:pencil-simple' : 'ph:plus'
                "
                class="size-3.5"
              />
            </template>
          </Button>
        </div>
      </FormField>

      <Popover ref="wellPurposePopover">
        <div class="flex flex-col gap-2.5 p-1 min-w-60">
          <label
            v-for="option in wellPurposeOptions"
            :key="option.value"
            class="flex items-center gap-2.5 text-sm text-content-0 cursor-pointer"
          >
            <Checkbox v-model="wellPurpose" :value="option.value" />
            {{ option.label }}
          </label>
        </div>
      </Popover>

      <Message v-if="hasDeprecatedWellType" severity="warn" size="small">
        <div class="flex flex-col items-start gap-2">
          <span>{{ t('editor.general.artesianDeprecated.message') }}</span>
          <Button
            :label="t('editor.general.artesianDeprecated.action')"
            severity="warn"
            size="small"
            outlined
            @click="profileStore.well.well_type = 'tubular'"
          />
        </div>
      </Message>

      <Tag
        v-if="profileStore.flowingArtesian"
        severity="info"
        class="self-start"
        :value="t('editor.general.flowingArtesian')"
      />
    </section>

    <!-- ── Section: Well Identifiers ────────────────────────────────────── -->
    <section class="flex flex-col gap-5">
      <div class="flex items-baseline justify-between">
        <div class="flex items-center gap-1.5">
          <h3
            class="font-serif text-[22px] font-medium tracking-[-0.015em] text-content-0 m-0"
          >
            {{ t('editor.general.wellIds.title') }}
          </h3>
          <InfoPopover
            size="md"
            :label="t('editor.general.wellIds.info.label')"
          >
            <div class="flex flex-col gap-2.5">
              <p class="m-0 font-semibold text-content-0">
                {{ t('editor.general.wellIds.info.title') }}
              </p>
              <p class="m-0">{{ t('editor.general.wellIds.info.what') }}</p>
              <p class="m-0">
                {{ t('editor.general.wellIds.info.examplesIntro') }}
              </p>
              <ul class="m-0 pl-4 list-disc flex flex-col gap-1">
                <li>{{ t('editor.general.wellIds.info.exampleGrant') }}</li>
                <li>{{ t('editor.general.wellIds.info.exampleSiagas') }}</li>
                <li>{{ t('editor.general.wellIds.info.exampleCompany') }}</li>
              </ul>
              <p class="m-0">{{ t('editor.general.wellIds.info.fields') }}</p>
              <p class="m-0">{{ t('editor.general.wellIds.info.primary') }}</p>
            </div>
          </InfoPopover>
        </div>
        <span
          class="font-mono text-[10px] tracking-[0.08em] uppercase text-content-500"
        >
          {{ t('editor.general.wellIds.tag') }} · {{ t('editor.well') }}
        </span>
      </div>

      <div v-if="profileStore.well.well_id?.length" class="flex flex-col gap-2">
        <div
          v-for="(entry, index) in profileStore.well.well_id"
          :key="index"
          class="flex items-center gap-2"
        >
          <RadioButton
            v-tooltip.top="
              primaryIndex === index
                ? t('editor.general.wellIds.primaryTooltip')
                : t('editor.general.wellIds.setPrimaryTooltip')
            "
            :model-value="primaryIndex"
            :value="index"
            :aria-label="t('editor.general.wellIds.setPrimaryTooltip')"
            :pt="{ root: 'cursor-pointer' }"
            @click="setPrimary(index)"
          />
          <div class="flex flex-1 flex-col gap-2 sm:flex-row">
            <Select
              v-model="entry.authority"
              :options="AUTHORITY_SUGGESTIONS"
              editable
              :placeholder="t('editor.general.wellIds.authorityPlaceholder')"
              class="w-full sm:w-40 sm:shrink-0"
            />
            <InputText
              v-model="entry.id"
              :placeholder="t('editor.general.wellIds.idPlaceholder')"
              class="w-full font-mono"
            />
          </div>
          <Button
            severity="secondary"
            text
            :aria-label="t('editor.general.wellIds.delete')"
            @click="deleteWellId(index)"
          >
            <template #icon>
              <Icon name="ph:trash" />
            </template>
          </Button>
        </div>
      </div>

      <p v-else class="text-sm text-content-400 italic">
        {{ t('editor.general.wellIds.empty') }}
      </p>

      <Button
        unstyled
        class="well-ids-add-btn"
        type="button"
        @click="addWellId"
      >
        <template #icon>
          <Icon name="ph:plus" />
        </template>
        {{ t('editor.general.wellIds.addRow') }}
      </Button>
    </section>

    <!-- ── Section: Location ──────────────────────────────────────────────── -->
    <section class="flex flex-col gap-5">
      <div class="flex items-baseline justify-between">
        <h3
          class="font-serif text-[22px] font-medium tracking-[-0.015em] text-content-0 m-0"
        >
          {{ t('editor.general.location') }}
        </h3>
        <span
          class="font-mono text-[10px] tracking-[0.08em] uppercase text-content-500"
        >
          {{ t('editor.general.coordinates') }}
        </span>
      </div>

      <LocationPicker
        :lat="location.lat"
        :lng="location.lng"
        :elevation="location.elevation"
        @update:lat="value => updateLocationField('lat', value)"
        @update:lng="value => updateLocationField('lng', value)"
        @update:elevation="value => updateLocationField('elevation', value)"
      />
    </section>

    <!-- ── Section: Observations ──────────────────────────────────────────── -->
    <section class="flex flex-col gap-5">
      <div class="flex items-baseline justify-between">
        <h3
          class="font-serif text-[22px] font-medium tracking-[-0.015em] text-content-0 m-0"
        >
          {{ t('editor.general.observations') }}
        </h3>
        <span
          class="font-mono text-[10px] tracking-[0.08em] uppercase text-content-500"
        >
          {{ t('editor.general.freeNotes') }}
        </span>
      </div>

      <FormField :label="t('editor.general.observationsLabel')">
        <Textarea
          v-model="profileStore.well.obs"
          class="w-full font-mono text-sm"
          :rows="5"
        />
      </FormField>
    </section>
  </div>
</template>

<style scoped>
.well-ids-add-btn {
  align-self: flex-start;
  margin-top: 10px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 14px;
  min-height: 32px;
  border-radius: 999px;
  border: 1px dashed var(--color-surface-300);
  background: var(--color-surface-50);
  color: var(--color-content-300);
  font-family: var(--font-display);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.01em;
  cursor: pointer;
  transition:
    background 120ms ease,
    color 120ms ease,
    border-color 120ms ease;
}

.well-ids-add-btn:hover {
  background: var(--color-surface-100);
  color: var(--color-content-0);
  border-color: var(--color-content-0);
}

.well-ids-add-btn:active {
  transform: translateY(0.5px);
}

.well-ids-add-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px
    color-mix(in srgb, var(--color-primary-500) 25%, transparent);
  border-color: var(--color-primary-500);
}
</style>
