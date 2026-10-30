<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { Guide } from '@utpost/shared'
import { get } from '../api'
import GuideCard from '../components/GuideCard.vue'

const guides = ref<Guide[]>([])
const query = ref('')
const loading = ref(true)
const error = ref<string | null>(null)

const load = async () => {
  loading.value = true
  error.value = null
  try {
    guides.value = await get<Guide[]>('/guides')
  } catch (err) {
    error.value = (err as Error).message
  } finally {
    loading.value = false
  }
}

onMounted(load)

const visible = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return guides.value
  return guides.value.filter(
    (g) => g.title.toLowerCase().includes(q) || g.region.toLowerCase().includes(q),
  )
})
</script>

<template>
  <div>
    <h1>Guider</h1>

    <div class="searchrow">
      <label for="guide-search">Sök</label>
      <input id="guide-search" v-model="query" type="search" placeholder="Namn eller landskap" />
      <span class="muted">{{ visible.length }} av {{ guides.length }}</span>
    </div>

    <p v-if="loading">Laddar guider…</p>
    <p v-else-if="error" role="alert">Kunde inte hämta guider: {{ error }}</p>
    <p v-else-if="visible.length === 0">Inga guider matchar sökningen.</p>

    <div v-else class="grid">
      <GuideCard v-for="guide in visible" :key="guide.id" :guide="guide" />
    </div>
  </div>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
}
.searchrow {
  display: flex;
  gap: 8px;
  align-items: center;
  margin: 16px 0;
}
.searchrow input {
  flex: 1;
  padding: 8px;
  border: 1px solid #ccc;
}
.muted {
  color: #777;
  font-size: 14px;
}
</style>
