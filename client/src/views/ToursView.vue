<script setup lang="ts">
import { useQuery } from '@urql/vue'
import { graphql } from '../gql'
import { formatKm } from '../lib/tours'

// Turlistan via GraphQL (M5). Via REST hämtade /api/tours ~290 kB med alla mätpunkter för
// en tabell med fem kolumner; nu ber frågan om det tabellen visar. `user` och `guide` är
// relationerna som kostade 1 + 50 + 38 databasfrågor i M4 – med DataLoader i API:et kostar
// hela frågan 4 (se extensions.databasfragor i svaret).
const ToursDocument = graphql(/* GraphQL */ `
  query Tours {
    tours(limit: 50) {
      id
      title
      distanceM
      user {
        displayName
      }
      guide {
        title
      }
      photos {
        id
      }
    }
  }
`)

const { data, fetching, error } = useQuery({ query: ToursDocument })
</script>

<template>
  <div>
    <h1>Turer</h1>
    <p v-if="fetching">Laddar turer…</p>
    <p v-else-if="error" role="alert">Kunde inte hämta turer: {{ error.message }}</p>
    <table v-else-if="data" class="tours">
      <thead>
        <tr>
          <th>Tur</th>
          <th>Av</th>
          <th>Guide</th>
          <th>Längd</th>
          <th>Bilder</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="t in data.tours" :key="t.id">
          <td>
            <RouterLink :to="`/turer/${t.id}`">{{ t.title }}</RouterLink>
          </td>
          <td>{{ t.user.displayName }}</td>
          <td>{{ t.guide ? t.guide.title : '-' }}</td>
          <td>{{ formatKm(t.distanceM) }}</td>
          <td>{{ t.photos.length }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.tours {
  width: 100%;
  border-collapse: collapse;
}
.tours th {
  text-align: left;
  padding: 10px;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #4a554f;
  background: #e8e4d8;
}
.tours td {
  padding: 8px 10px;
  border-bottom: 1px solid #eee;
}
</style>
