<template>
  <v-app>
    <div
      :style="{
        'display': 'flex',
        'align-items': 'center',
        padding: '10px',
        'padding-top': 0,
      }"
    >
      <v-switch v-model="toggle" inset hide-details class="ma-0 pa-0" />
      Toggle commercial playback logic
    </div>
    <v-btn @click="disable" :disabled="disabled">
      Disable Commercials (rest of run)
    </v-btn>
  </v-app>
</template>

<script lang="ts">
import { replicantModule, ReplicantTypes } from '@esa-commercials/browser_shared/replicant_store';
import { Disabled, Toggle } from '@esa-commercials/types/schemas';
import { Vue, Component } from 'vue-property-decorator';
import { Getter } from 'vuex-class';

@Component
export default class extends Vue {
  @Getter reps!: ReplicantTypes;
  @Getter disabled!: Disabled;

  get toggle(): Toggle {
    return this.reps.toggle;
  }
  set toggle(val: Toggle) {
    replicantModule.setReplicant<Toggle>({ name: 'toggle', val });
  }

  disable(): void {
    nodecg.sendMessage('disable');
  }
}
</script>
