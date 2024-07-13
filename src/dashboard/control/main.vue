<script setup lang="ts">
import { Cycles, Disabled, Toggle } from '@esa-commercials/types/schemas';
import { useHead } from '@unhead/vue';
import { useReplicant } from 'nodecg-vue-composable';
import { Timer } from 'speedcontrol-util/types';
import { computed } from 'vue';

useHead({ title: 'ESA Commercial Control' });

const cycles = useReplicant<Cycles>('cycles', undefined);
const disabled = useReplicant<Disabled>('disabled', undefined);
const toggle = useReplicant<Toggle>('toggle', undefined);
const runTimer = useReplicant<Timer>('timer', 'nodecg-speedcontrol');

const frequency = computed(() => cycles?.oldData?.frequency ?? 0);
const nextCommercial = computed(() => {
  const timerS = (runTimer?.oldData?.milliseconds ?? 0) / 1000;
  return frequency.value - (timerS % frequency.value);
});

const disable = () => { nodecg.sendMessage('disable'); };
</script>

<template>
  <div>
    <template v-if="typeof toggle?.data !== 'undefined'">
      <QToggle
        v-model="toggle.data"
        @update:model-value="toggle?.save()"
        dense
        class="q-mb-sm q-mr-sm"
        label="Toggle commercial playback logic"
      />
    </template>
    <QBtn color="primary" class="full-width" @click="disable" :disable="disabled?.oldData">
      Disable Commercials (rest of run)
    </QBtn>
    <div class="q-mt-sm">
      <div v-if="cycles?.oldData">
        <span>Commercial frequency</span>:
          ~{{ Math.round(frequency / 60) }}m
        <br><span>Next commercial</span>:
          ~{{ Math.round(nextCommercial / 60) }}m
        <br><span>Planned commercials played:</span>
          {{ cycles.oldData?.countIndex }}/{{ cycles.oldData?.countTotal }}
      </div>
      <div v-else class="text-italic">
        No commercial cycle is currently running.
      </div>
    </div>
  </div>
</template>
