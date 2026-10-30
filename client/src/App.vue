<script setup>
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <header>
    <RouterLink to="/">Utpost</RouterLink>
    <nav>
      <RouterLink to="/guider">Guider</RouterLink>
      <RouterLink to="/turer">Turer</RouterLink>
    </nav>
  </header>
  <main>
    <RouterView />
  </main>
</template>
