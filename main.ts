import { findProductNameFromVendorAndProductId } from "./device_lookup";
import { RadioDevice } from "./radio_device";

enum USB_REG {
  USB_SYSCTL = 0x2000,
  USB_CTRL = 0x2010,
  USB_STAT = 0x2014,
  USB_EPA_CFG = 0x2144,
  USB_EPA_CTL = 0x2148,
  USB_EPA_MAXPKT = 0x2158,
  USB_EPA_MAXPKT_2 = 0x215a,
  USB_EPA_FIFO_CFG = 0x2160
}

enum BLOCKS {
  DEMODB = 0,
  USBB = 1,
  SYSB = 2,
  TUNB = 3,
  ROMB = 4,
  IRB = 5,
  IICB = 6
}

// https://github.com/steve-m/librtlsdr/blob/18bf26989c926a5db4fca29e7d859af42af1437c/src/librtlsdr.c#L382
enum SYS_REG {
  DEMOD_CTL = 0x3000,
  GPO = 0x3001,
  GPI = 0x3002,
  GPOE = 0x3003,
  GPD = 0x3004,
  SYSINTE = 0x3005,
  SYSINTS = 0x3006,
  GP_CFG0 = 0x3007,
  GP_CFG1 = 0x3008,
  SYSINTE_1 = 0x3009,
  SYSINTS_1 = 0x300a,
  DEMOD_CTL_1 = 0x300b,
  IR_SUSPEND = 0x300c
}

enum USBRequestType {
  STANDARD = "standard",
  CLASS = "class",
  VENDOR = "vendor"
}

enum USBRecipient {
  DEVICE = "device",
  INTERFACE = "interface",
  ENDPOINT = "endpoint",
  OTHER = "other"
}

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
      const r = await rtlsdr_write_reg(
        radio,
        BLOCKS.USBB,
        USB_REG.USB_SYSCTL,
        0x09,
        1
      );
      console.log(r);
    } catch (e) {
      throw new Error("Device in invalid state.. please reconnect.");
    }

    // setup radio device.
    await rtlsdr_init_baseband(radio);

    // Turn radio on
    await rtlsdr_set_i2c_repeater(radio, true);
    // Turn radio off
    await rtlsdr_set_i2c_repeater(radio, false);
  } else {
    throw new Error("Unknown device found.");
  }
}

async function rtlsdr_write_reg(
  device: RadioDevice,
  block: number,
  addr: number,
  val: number,
  len: number
) {
  let data = new Uint8Array(2);

  const index = (block << 8) | 0x10;

  if (len == 1) {
    data[0] = val & 0xff;
  } else {
    data[0] = val >> 8;
  }

  data[1] = val & 0xff;

  // #define CTRL_OUT	(LIBUSB_REQUEST_TYPE_VENDOR | LIBUSB_ENDPOINT_OUT)
  // r = libusb_control_transfer(dev->devh, CTRL_OUT, 0, addr, index, data, len, CTRL_TIMEOUT);
  const r = await device.usb.controlTransferOut(
    {
      requestType: USBRequestType.VENDOR,
      recipient: USBRecipient.DEVICE,
      index,
      request: 0,
      value: addr
    },
    data
  );

  if (r.status !== "ok") {
    console.log(r);
    throw new Error(`Failed with response code ${r.status}`);
  }

  return r;
}

async function rtlsdr_demod_read_reg(
  device: RadioDevice,
  page: number,
  addr: number,
  val: number
) {
  const data = new Uint8Array(2);
  const index = page;
  let reg: number;
  addr = (addr << 8) | 0x20;

  // CTRL_IN         (LIBUSB_REQUEST_TYPE_VENDOR | LIBUSB_ENDPOINT_IN)
  //r = libusb_control_transfer(dev->devh, CTRL_IN, 0, addr, index, data, len, CTRL_TIMEOUT);

  /*
    libusb_device_handle * 	dev_handle,
    uint8_t 	bmRequestType,
    uint8_t 	bRequest,
    uint16_t 	wValue,
    uint16_t 	wIndex,
    unsigned char * 	data,
    uint16_t 	wLength,
    unsigned int 	timeout 
  */

  //   value === uint16_t 	wValue,
  //   index === uint16_t 	wIndex,
  //   request === bRequest

  const r = await device.usb.controlTransferIn(
    {
      requestType: USBRequestType.VENDOR,
      recipient: USBRecipient.DEVICE,
      index,
      request: 0,
      value: addr
    },
    data.length
  );

  if (r.status !== "ok") {
    console.log(r);
    throw new Error(`Failed with response ${r}`);
  }

  reg = (data[1] << 8) | data[0];

  return reg;
}

async function rtlsdr_demod_write_reg(
  device: RadioDevice,
  page: number,
  addr: number,
  val: number,
  len: number
) {
  const data = new Uint8Array(2);
  const index = 0x10 | page;
  addr = (addr << 8) | 0x20;

  if (len === 1) {
    data[0] = val & 0xff;
  } else {
    data[0] = val >> 8;
  }

  data[1] = val & 0xff;

  // #define CTRL_OUT	(LIBUSB_REQUEST_TYPE_VENDOR | LIBUSB_ENDPOINT_OUT)
  //const r = libusb_control_transfer(dev->devh, CTRL_OUT, 0, addr, index, data, len, CTRL_TIMEOUT);
  const r = await device.usb.controlTransferOut(
    {
      requestType: USBRequestType.VENDOR,
      recipient: USBRecipient.DEVICE,
      index,
      request: 0,
      value: addr
    },
    data
  );

  if (r.status !== "ok") {
    throw new Error(`Failed with response code ${r.status}`);
  }

  await rtlsdr_demod_read_reg(device, 0x0a, 0x01, 1);

  return r.bytesWritten === length ? 0 : -1;
}

async function rtlsdr_set_fir(device: RadioDevice) {
  const fir = new Uint8Array(20);

  /* format: int8_t[8] */
  for (let i = 0; i < 8; ++i) {
    let val = device.fir[i];
    if (val < -128 || val > 127) {
      return -1;
    }
    fir[i] = val;
  }
  /* format: int12_t[8] */
  for (let i = 0; i < 8; i += 2) {
    const val0 = device.fir[8 + i];
    const val1 = device.fir[8 + i + 1];
    if (val0 < -2048 || val0 > 2047 || val1 < -2048 || val1 > 2047) {
      return -1;
    }
    fir[8 + i * 3 / 2] = val0 >> 4;
    fir[8 + i * 3 / 2 + 1] = (val0 << 4) | ((val1 >> 8) & 0x0f);
    fir[8 + i * 3 / 2 + 2] = val1;
  }

  for (let i = 0; i < device.fir.length; i++) {
    if (await rtlsdr_demod_write_reg(device, 1, 0x1c + i, fir[i], 1)) {
      return -1;
    }
  }

  return 0;
}

async function rtlsdr_set_i2c_repeater(device: RadioDevice, on: boolean) {
  return rtlsdr_demod_write_reg(device, 1, 0x01, on ? 0x18 : 0x10, 1);
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
