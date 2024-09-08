<template>
  <div class="about">
    <h1>Model XML Viewer</h1>
    <pre>
    {{ xmlModel }}
    </pre>
  </div>
</template>
<script setup>
import { computed } from 'vue';
import { useModelStore } from '@/stores/model';

const store = useModelStore()

const xmlModel = computed(() => store.xmlModel)

</script>

<style>
@media (min-width: 1024px) {
  .about {
    min-height: 100vh;
    display: flex;
    align-items: center;
  }
}
</style>
