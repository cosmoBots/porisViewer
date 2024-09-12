<template>
  <header>
    <div class="wrapper">
      <modelSelector  />

      <nav>
        <RouterLink :to="{ name: 'config' }">Config Panel</RouterLink>
        <RouterLink v-if="!remoteModel" :to="{ name: 'xml' }">Model Source XML</RouterLink>
      </nav>

      <!--div>
        <h3>Valid Modes</h3>
        <ul class="parametersModes">
          <li v-for="param in validModes" :key="param.id">{{ param.name }} / {{ param.id }}</li>
        </ul>
      </div>
      <div>
        <h3>Current Modes</h3>
        <ul class="parametersModes">
          <li v-for="param in currentModes" :key="param.id">{{ param.name }} / {{ param.id }}</li>
        </ul>
      </div>
      <div>
        <h3>Model Values</h3>
        <ul class="parametersModes">
          <li v-for="(value, name) of systemValues" :key="name">{{ name }} = {{ value }}</li>
        </ul>
      </div -->
    </div>
  </header>

  <RouterView />
</template>
<script setup>
import { RouterLink, RouterView } from 'vue-router'
import modelSelector from './components/ModelSelector.vue'

let remoteModel = false
//let formpath = "./csys_poris/prj-ident/form?issue_id=12345&key=12345"
try {
  formpath;
  remoteModel = true
} catch (error) {
  /* Do nothing */
}


</script>

<style scoped>
header {
  /*line-height: 1.5;
  max-height: 100vh;*/
}

.logo {
  display: block;
  margin: 0 auto 2rem;
}

nav {
  width: 100%;
  font-size: 12px;
  text-align: center;
  margin-top: 2rem;
}

nav a.router-link-exact-active {
  color: var(--color-text);
}

nav a.router-link-exact-active:hover {
  background-color: transparent;
}

nav a {
  display: inline-block;
  padding: 0 1rem;
  border-left: 1px solid var(--color-border);
}

nav a:first-of-type {
  border: 0;
}

@media (min-width: 1024px) {
  header {
    /*display: flex;*/
    place-items: center;
    padding-right: calc(var(--section-gap) / 2);
  }

  .logo {
    margin: 0 2rem 0 0;
  }

  header .wrapper {
    display: flex;
    place-items: flex-start;
    flex-wrap: wrap;
  }

  nav {
    text-align: left;
    margin-left: -1rem;
    font-size: 1rem;

    padding: 1rem 0;
    margin-top: 1rem;
  }
}
</style>
