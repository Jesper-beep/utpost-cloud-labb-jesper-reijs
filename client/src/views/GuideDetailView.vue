<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useQuery } from '@urql/vue'
import { graphql } from '../gql'

// Detaljvyn: frågan tar en variabel ($slug) i stället för att klistra in adressen i strängen.
// Codegen genererar typen för variablerna också – skicka fel typ, och typecheck säger ifrån.
const GuideDocument = graphql(/* GraphQL */ `
  query Guide($slug: String!) {
    guide(slug: $slug) {
      slug
      title
      region
      difficulty
      lengthKm
      bodyHtml
    }
  }
`)

const route = useRoute()
// Variablerna är reaktiva: byter adressen slug kör urql frågan igen (eller svarar ur cachen).
const variables = computed(() => ({ slug: route.params.slug as string }))
const { data, fetching, error } = useQuery({ query: GuideDocument, variables })
</script>

<template>
  <p v-if="error" role="alert">{{ error.message }}</p>
  <p v-else-if="fetching || !data">Laddar…</p>
  <p v-else-if="!data.guide" role="alert">Det finns ingen guide som heter så.</p>
  <article v-else>
    <h1>{{ data.guide.title }}</h1>
    <p class="muted">
      {{ data.guide.region }} · {{ data.guide.difficulty }} · {{ data.guide.lengthKm }} km
    </p>
    <!-- Redaktionens HTML ur databasen (skuld 10). Rå HTML från servern – flyttar till CMS i M9. -->
    <!-- eslint-disable-next-line vue/no-v-html -->
    <div class="body" v-html="data.guide.bodyHtml"></div>
  </article>
</template>

<style scoped>
.muted {
  color: #777;
  font-size: 14px;
}
.body {
  max-width: 70ch;
}
</style>
