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
    <div class="ma-2 mb-0">
      <div v-if="cycles">
        <span class="font-weight-bold">Commercial frequency</span>:
          ~{{ Math.round(frequency / 60) }}m
        <br><span class="font-weight-bold">Next commercial</span>:
          ~{{ Math.round(nextCommercial / 60) }}m
        <br><span class="font-weight-bold">Planned commercials played:</span>
          {{ cycles.countIndex }}/{{ cycles.countTotal }}
      </div>
      <div v-else class="font-italic">
        No commercial cycle is currently running.
      </div>
    </div>
  </v-app>
</template>

<script lang="ts">
import { replicantModule, ReplicantTypes } from '@esa-commercials/browser_shared/replicant_store';
import { Cycles, Disabled, Toggle } from '@esa-commercials/types/schemas';
import { Vue, Component } from 'vue-property-decorator';
import { Getter } from 'vuex-class';
import { SpeedcontrolUtilBrowser } from 'speedcontrol-util';
import { Timer } from 'speedcontrol-util/types';
import clone from 'clone';

const sc = new SpeedcontrolUtilBrowser(nodecg);

@Component
export default class extends Vue {
  @Getter reps!: ReplicantTypes;
  @Getter disabled!: Disabled;
  @Getter cycles!: Cycles;
  runTimer: Timer | null = null;

  get frequency(): number {
    return this.cycles?.frequency ?? 0;
  }

  get nextCommercial(): number {
    const timerS = (this.runTimer?.milliseconds ?? 0) / 1000;
    return this.frequency - (timerS % this.frequency);
  }

  get toggle(): Toggle {
    return this.reps.toggle;
  }
  set toggle(val: Toggle) {
    replicantModule.setReplicant<Toggle>({ name: 'toggle', val });
  }

  disable(): void {
    nodecg.sendMessage('disable');
  }

  created(): void {
    sc.timer.on('change', (val) => Vue.set(this, 'runTimer', clone(val) ?? null));
  }
}
</script>
