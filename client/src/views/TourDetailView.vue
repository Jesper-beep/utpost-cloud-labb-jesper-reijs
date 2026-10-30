<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import type { TourDetail } from '@utpost/shared'
import { get } from '../api'
import { elevationGain, formatKm } from '../lib/tours'

const route = useRoute()
const tour = ref<TourDetail | null>(null)
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    tour.value = await get<TourDetail>(`/tours/${route.params.id}`)
  } catch (err) {
    error.value = (err as Error).message
  }
})

const climb = computed(() => (tour.value ? elevationGain(tour.value.logs) : 0))

const time = (iso: string) => new Date(iso).toLocaleTimeString('sv-SE')
</script>

<template>
  <p v-if="error" role="alert">{{ error }}</p>
  <p v-else-if="!tour">Laddar…</p>
  <div v-else>
    <h1>{{ tour.title }}</h1>
    <p class="muted">
      {{ formatKm(tour.distance_m) }} · {{ tour.logs.length }} mätpunkter · {{ climb }} höjdmeter
    </p>
    <p v-if="tour.notes">{{ tour.notes }}</p>
    <h2>Mätpunkter</h2>
    <ol class="logs">
      <li v-for="log in tour.logs" :key="log.id">
        {{ time(log.recorded_at) }} · {{ log.elevation_m ?? '–' }} m ·
        {{ log.heart_rate ?? '–' }} slag/min
      </li>
    </ol>
  </div>
</template>

<style scoped>
.muted {
  color: #777;
  font-size: 14px;
}
.logs {
  font-size: 14px;
  color: #444;
  padding-left: 40px;
}
</style>
