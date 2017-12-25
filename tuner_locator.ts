import { RadioDevice } from "./radio_device";
import { rtlsdr_i2c_read_reg } from "./read_write";

/**
 * TODO port more of the tuner locators
 */

// https://github.com/steve-m/librtlsdr/blob/18bf26989c926a5db4fca29e7d859af42af1437c/src/librtlsdr.c#L1537
export async function findTuner(radio: RadioDevice) {
  const registerValue = await rtlsdr_i2c_read_reg(radio, 0x34, 0x00);
  if (registerValue === 0x69) {
    console.info("Found Rafael Micro R820T tuner");
  }
}
