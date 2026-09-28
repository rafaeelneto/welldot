<script setup lang="ts">
import SectionWellhead from './construction/SectionWellhead.vue';
import SectionBoreHole from './construction/SectionBoreHole.vue';
import SectionSurfaceCase from './construction/SectionSurfaceCase.vue';
import SectionHoleFill from './construction/SectionHoleFill.vue';
import SectionWellCase from './construction/SectionWellCase.vue';
import SectionReduction from './construction/SectionReduction.vue';
import SectionWellScreen from './construction/SectionWellScreen.vue';
import SectionCentralizers from './construction/SectionCentralizers.vue';
</script>

<template>
  <div class="flex flex-col gap-8 p-6">
    <SectionWellhead />

    <!-- Bore Hole + Surface Case: responsive side-by-side layout -->
    <div class="@container">
      <div class="flex flex-col gap-8 @[700px]:flex-row @[700px]:items-start">
        <SectionBoreHole />
        <SectionSurfaceCase />
      </div>
    </div>

    <SectionHoleFill />
    <SectionWellCase />
    <SectionReduction />
    <SectionWellScreen />
    <SectionCentralizers />
  </div>
</template>
