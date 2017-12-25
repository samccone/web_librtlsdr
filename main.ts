import { findProductNameFromVendorAndProductId } from "./device_lookup";
import { RadioDevice } from "./radio_device";
import {
  rtlsdr_write_reg,
  rtlsdr_set_i2c_repeater,
  BLOCKS,
  USB_REG,
  SYS_REG,
  rtlsdr_demod_write_reg,
  rtlsdr_set_fir
} from "read_write";
import { findTuner, setupRadioTuner } from "./tuner_locator";

function sleep(time: number) {
  return new Promise(res => {
    setTimeout(res, time);
  });
}

export async function run() {
  let devices = await navigator.usb.getDevices();
  devices.forEach(async device => {
    await handleDevice(device);
  });

  document.querySelector("#auth")!.addEventListener("click", async () => {
    const requestedDevice = await navigator.usb.requestDevice({ filters: [] });
    handleDevice(requestedDevice);
  });
}

async function handleDevice(device: USBDevice) {
  const product = findProductNameFromVendorAndProductId(
    device.vendorId,
    device.productId
  );

  if (product != null) {
    console.info(`Found device ${product}`);
    await device.open();
    const radio = new RadioDevice(device);
    await radio.claimIntefaces();

    /* perform a dummy write, if it fails, reset the device */
    try {
      await rtlsdr_write_reg(radio, BLOCKS.USBB, USB_REG.USB_SYSCTL, 0x09, 1);
    } catch (e) {
      throw new Error("Device in invalid state.. please reconnect.");
    }

    // setup radio device.
    await rtlsdr_init_baseband(radio);

    // Turn radio on
    await rtlsdr_set_i2c_repeater(radio, true);

    const tunerType = await findTuner(radio);
    if (tunerType === undefined) {
      throw new Error("Unknown tuner type.");
    }
    radio.tuner = tunerType;

    await setupRadioTuner(radio);

    // Turn radio off
    await rtlsdr_set_i2c_repeater(radio, false);
  } else {
    throw new Error("Unknown device found.");
  }
}

async function rtlsdr_init_baseband(dev: RadioDevice) {
  /* initialize USB */
  await rtlsdr_write_reg(dev, BLOCKS.USBB, USB_REG.USB_SYSCTL, 0x09, 1);
  await rtlsdr_write_reg(dev, BLOCKS.USBB, USB_REG.USB_EPA_MAXPKT, 0x0002, 2);
  await rtlsdr_write_reg(dev, BLOCKS.USBB, USB_REG.USB_EPA_CTL, 0x1002, 2);

  /* poweron demod */
  await rtlsdr_write_reg(dev, BLOCKS.SYSB, SYS_REG.DEMOD_CTL_1, 0x22, 1);
  await rtlsdr_write_reg(dev, BLOCKS.SYSB, SYS_REG.DEMOD_CTL, 0xe8, 1);

  await sleep(10);

  /* reset demod (bit 3, soft_rst) */
  await rtlsdr_demod_write_reg(dev, 1, 0x01, 0x14, 1);
  await rtlsdr_demod_write_reg(dev, 1, 0x01, 0x10, 1);

  /* disable spectrum inversion and adjacent channel rejection */
  await rtlsdr_demod_write_reg(dev, 1, 0x15, 0x00, 1);
  await rtlsdr_demod_write_reg(dev, 1, 0x16, 0x0000, 2);

  /* clear both DDC shift and IF frequency registers  */
  for (let i = 0; i < 6; i++) {
    await rtlsdr_demod_write_reg(dev, 1, 0x16 + i, 0x00, 1);
  }

  await rtlsdr_set_fir(dev);

  /* enable SDR mode, disable DAGC (bit 5) */
  await rtlsdr_demod_write_reg(dev, 0, 0x19, 0x05, 1);

  /* init FSM state-holding register */
  await rtlsdr_demod_write_reg(dev, 1, 0x93, 0xf0, 1);
  await rtlsdr_demod_write_reg(dev, 1, 0x94, 0x0f, 1);

  /* disable AGC (en_dagc, bit 0) (this seems to have no effect) */
  await rtlsdr_demod_write_reg(dev, 1, 0x11, 0x00, 1);

  /* disable RF and IF AGC loop */
  await rtlsdr_demod_write_reg(dev, 1, 0x04, 0x00, 1);

  /* disable PID filter (enable_PID = 0) */
  await rtlsdr_demod_write_reg(dev, 0, 0x61, 0x60, 1);

  /* opt_adc_iq = 0, default ADC_I/ADC_Q datapath */
  await rtlsdr_demod_write_reg(dev, 0, 0x06, 0x80, 1);

  /* Enable Zero-IF mode (en_bbin bit), DC cancellation (en_dc_est),
* IQ estimation/compensation (en_iq_comp, en_iq_est) */
  await rtlsdr_demod_write_reg(dev, 1, 0xb1, 0x1b, 1);

  /* disable 4.096 MHz clock output on pin TP_CK0 */
  await rtlsdr_demod_write_reg(dev, 0, 0x0d, 0x83, 1);
}
