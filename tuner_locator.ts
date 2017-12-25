const R82XX_IF_FREQ = 3570000;

import { RadioDevice, TUNERS } from "./radio_device";
import {
  rtlsdr_i2c_read_reg,
  rtlsdr_set_if_freq,
  rtlsdr_demod_write_reg
} from "./read_write";

/**
 * TODO port more of the tuner locators
 */

// https://github.com/steve-m/librtlsdr/blob/18bf26989c926a5db4fca29e7d859af42af1437c/src/librtlsdr.c#L1537
export async function findTuner(radio: RadioDevice) {
  const registerValue = await rtlsdr_i2c_read_reg(radio, 0x34, 0x00);
  if (registerValue === 0x69) {
    console.info("Found Rafael Micro R820T tuner");
    return TUNERS.RTLSDR_TUNER_R820T;
  }

  return undefined;
}

export async function setupRadioTuner(dev: RadioDevice) {
  switch (dev.tuner) {
    case TUNERS.RTLSDR_TUNER_R820T: {
      /* disable Zero-IF mode */
      await rtlsdr_demod_write_reg(dev, 1, 0xb1, 0x1a, 1);

      /* only enable In-phase ADC input */
      await rtlsdr_demod_write_reg(dev, 0, 0x08, 0x4d, 1);

      /* the R82XX use 3.57 MHz IF for the DVB-T 6 MHz mode, and
            * 4.57 MHz for the 8 MHz mode */
      await rtlsdr_set_if_freq(dev, R82XX_IF_FREQ);

      /* enable spectrum inversion */
      await rtlsdr_demod_write_reg(dev, 1, 0x15, 0x01, 1);
      break;
    }
    default: {
      console.log("unknown tuner.");
    }
  }
}
