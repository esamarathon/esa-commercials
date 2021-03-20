<template>
  <v-app>
    <v-btn @click="disable" :disabled="disabled">Disable Commercials (rest of run)</v-btn>
  </v-app>
</template>

<script lang="ts">
import { Disabled } from '@/types/schemas';
import { Vue, Component } from 'vue-property-decorator';
import { Getter } from 'vuex-class';

@Component
export default class extends Vue {
  @Getter disabled!: Disabled;

  disable(): void {
    nodecg.sendMessage('disable');
  }
}
</script>
