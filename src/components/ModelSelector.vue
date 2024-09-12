<template>
  <div class="greetings" v-if="!remoteModel">
    <h1 class="green">Model</h1>

    <input v-model="modelName" />
    <button @click="updateModel">Update Model</button>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useModelStore } from '@/stores/model'

const store = useModelStore()

const modelName = ref('osiris_reference_model')

const updateModel = () => {
  store.loadModel(modelName.value)
}

let remoteModel = false;
//let formpath = "./csys_poris/prj-ident/form?issue_id=12345&key=12345"
try {
  formpath;
  store.loadModelURL(formpath)
  remoteModel = true
}
catch (e) {
  if (e.name == "ReferenceError") {
    /* Do nothing */
  }
}
</script>

<style scoped>
h1 {
  font-weight: 500;
  font-size: 2.6rem;
  position: relative;
  top: -10px;
}

h3 {
  font-size: 1.2rem;
}

.greetings h1,
.greetings h3 {
  text-align: center;
}

@media (min-width: 1024px) {

  .greetings h1,
  .greetings h3 {
    text-align: left;
  }
}
</style>
