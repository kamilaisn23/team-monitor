<script setup lang="ts">
import { computed } from "vue";
import Icon from "./Icon.vue";
import type { DashboardTrends } from "../../../src/types/dashboard";
const props = defineProps<{ trends?: DashboardTrends; loading: boolean }>();
const maximum = computed(() => Math.max(1, ...(props.trends?.weeks.flatMap((week) => [week.created, week.resolved]) ?? [])));
const latest = computed(() => props.trends?.weeks.at(-1));
const date = (value: string) => new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "short" }).format(new Date(value));
const delta = (value: number) => value === 0 ? "Sama dengan periode sebelumnya" : `${Math.abs(value)} isu lebih ${value > 0 ? 'banyak' : 'sedikit'} dari periode sebelumnya`;
</script>
<template>
  <section class="surface weekly-trends" aria-label="Tren mingguan" :aria-busy="loading">
    <div class="weekly-trends-heading">
      <div><div class="eyebrow">PERKEMBANGAN TIM</div><h2>Bagaimana progres minggu ini?</h2><p>Empat periode berurutan, masing-masing 7 hari.</p></div>
      <span class="scope-tag"><Icon name="calendar" :size="15" />28 hari terakhir</span>
    </div>
    <div v-if="loading" class="compact-empty" role="status">Memuat tren pekerjaan…</div>
    <div v-else-if="!trends" class="compact-empty">Tren belum tersedia. Coba muat ulang dashboard.</div>
    <template v-else>
      <div class="weekly-trends-content">
        <div class="weekly-highlights">
          <div><span class="trend-label"><i class="trend-dot created"></i>Isu dibuat</span><strong>{{ latest?.created ?? 0 }}<small>7 hari terakhir</small></strong><p>{{ delta(trends.createdDelta) }}</p></div>
          <div><span class="trend-label"><i class="trend-dot resolved"></i>Isu selesai</span><strong>{{ latest?.resolved ?? 0 }}<small>7 hari terakhir</small></strong><p>{{ delta(trends.resolvedDelta) }}</p></div>
        </div>
        <div class="weekly-chart" role="img" :aria-label="trends.weeks.map((week, index) => 'Periode ' + (index + 1) + ': ' + week.created + ' isu dibuat, ' + week.resolved + ' isu selesai').join('; ')">
          <div v-for="(week, index) in trends.weeks" :key="week.start" class="weekly-chart-column">
            <div class="weekly-chart-bars" aria-hidden="true">
              <div class="weekly-bar-track"><span>{{ week.created }}</span><i class="created" :style="{ height: (week.created / maximum * 100) + '%' }"></i></div>
              <div class="weekly-bar-track"><span>{{ week.resolved }}</span><i class="resolved" :style="{ height: (week.resolved / maximum * 100) + '%' }"></i></div>
            </div>
            <strong>{{ index === 3 ? '7 hari terakhir' : date(week.start) }}</strong><small>{{ date(week.start) }} – {{ date(week.end) }}</small>
          </div>
        </div>
      </div>
      <p class="panel-footnote"><Icon name="info" :size="14" />Mengikuti filter cakupan dan penugasan saat ini. Grafik menunjukkan pembuatan dan penutupan isu, bukan riwayat kapasitas anggota.</p>
    </template>
  </section>
</template>
