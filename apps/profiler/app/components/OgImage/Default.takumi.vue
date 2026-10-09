<script setup lang="ts">
defineProps<{
  kicker?: string;
  headline1?: string;
  headlineEm?: string;
  headline2?: string;
  tagline?: string;
  badgeSpec?: string;
  badgeLicense?: string;
  badgeSite?: string;
}>();

const LOGO_DATA_URI = `data:image/png;base64,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`;
</script>

<template>
  <div
    style="
      width: 1200px;
      height: 630px;
      display: flex;
      flex-direction: column;
      background-color: #ffffff;
      padding: 88px;
    "
  >
    <div style="display: flex; align-items: center; margin-bottom: 36px">
      <img
        :src="LOGO_DATA_URI"
        style="width: 40px; height: 40px; margin-right: 14px"
      />
      <div
        style="
          display: flex;
          font-size: 24px;
          font-weight: 700;
          color: #0d1218;
          letter-spacing: -0.01em;
        "
      >
        welldot
      </div>
    </div>

    <div
      style="
        display: flex;
        font-size: 15px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: #7888a0;
        margin-bottom: 22px;
      "
    >
      {{ kicker || '.well · open format' }}
    </div>

    <div
      style="
        display: flex;
        flex-wrap: wrap;
        font-weight: 500;
        font-size: 62px;
        line-height: 1.12;
        letter-spacing: -0.01em;
        color: #0d1218;
        max-width: 980px;
        margin-bottom: 28px;
      "
    >
      <span>{{ headline1 || 'Well profiles, in' }}&nbsp;</span>
      <span style="font-style: italic; color: #2f5fae">{{
        headlineEm || 'open format'
      }}</span>
      <span>{{ headline2 || '.' }}</span>
    </div>

    <div
      class="font-display"
      style="
        display: flex;
        font-size: 26px;
        line-height: 1.5;
        color: #4f5d75;
        max-width: 780px;
      "
    >
      {{
        tagline ||
        'Free editor to create, visualize, and export geological and construction profiles.'
      }}
    </div>

    <div style="display: flex; flex-grow: 1" />

    <div
      style="
        display: flex;
        align-items: center;
        gap: 44px;
        padding-top: 28px;
        border-top: 1px solid #d8dde3;
        font-size: 15px;
        letter-spacing: 0.02em;
        color: #7888a0;
      "
    >
      <div style="display: flex">
        <span style="color: #0d1218; font-weight: 500; margin-right: 6px"
          >v2.3</span
        >
        <span>{{ badgeSpec || 'spec' }}</span>
      </div>
      <div style="display: flex">
        <span style="color: #0d1218; font-weight: 500; margin-right: 6px"
          >Apache 2.0</span
        >
        <span>{{ badgeLicense || 'license' }}</span>
      </div>
      <div style="display: flex; color: #0d1218; font-weight: 500">
        {{ badgeSite || 'welldot.org' }}
      </div>
    </div>
  </div>
</template>
