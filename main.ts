import { findProductNameFromVendorAndProductId } from "./device_lookup";

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
    const openInterface = await getOpenInterfaceNumber(device);

    if (openInterface == null) {
      throw new Error("Unable to find open interface.");
    }

    await device.claimInterface(openInterface);
    console.info(`Interface ${openInterface} claimed`);

    /* perform a dummy write, if it fails, reset the device */
    await rtlsdr_write_reg(device, BLOCKS.USBB, USB_REG.USB_SYSCTL, 0x09, 1);
  } else {
    throw new Error("Unknown device found.");
  }
}

async function getOpenInterfaceNumber(device: USBDevice) {
  for (const config of device.configurations) {
    for (const iface of config.interfaces) {
      if (!iface.claimed) {
        return iface.interfaceNumber;
      }
    }
  }

  return null;
}

async function rtlsdr_write_reg(
  device: USBDevice,
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

  // r = libusb_control_transfer(dev->devh, CTRL_OUT, 0, addr, index, data, len, CTRL_TIMEOUT);
  const r = await device.controlTransferOut(
    {
      requestType: USBRequestType.VENDOR,
      recipient: USBRecipient.DEVICE,
      index,
      request: addr,
      value: val
    },
    data
  );

  if (r.status !== "ok") {
    throw new Error(`Failed with response code ${r}`);
  }
}

// function rtlsdr_init_baseband(dev: USBDevice) {
//   /* initialize USB */
//   rtlsdr_write_reg(dev, BLOCKS.USBB, USB_REG.USB_SYSCTL, 0x09, 1);
//   rtlsdr_write_reg(dev, BLOCKS.USBB, USB_REG.USB_EPA_MAXPKT, 0x0002, 2);
//   rtlsdr_write_reg(dev, BLOCKS.USBB, USB_REG.USB_EPA_CTL, 0x1002, 2);

//   /* poweron demod */
//   rtlsdr_write_reg(dev, BLOCKS.SYSB, SYS_REG.DEMOD_CTL_1, 0x22, 1);
//   rtlsdr_write_reg(dev, BLOCKS.SYSB, SYS_REG.DEMOD_CTL, 0xe8, 1);

//   /* reset demod (bit 3, soft_rst) */
//   rtlsdr_demod_write_reg(dev, 1, 0x01, 0x14, 1);
//   rtlsdr_demod_write_reg(dev, 1, 0x01, 0x10, 1);

//   /* disable spectrum inversion and adjacent channel rejection */
//   rtlsdr_demod_write_reg(dev, 1, 0x15, 0x00, 1);
//   rtlsdr_demod_write_reg(dev, 1, 0x16, 0x0000, 2);

//   /* clear both DDC shift and IF frequency registers  */
//   for (let i = 0; i < 6; i++) {
//     rtlsdr_demod_write_reg(dev, 1, 0x16 + i, 0x00, 1);
//   }

//   rtlsdr_set_fir(dev);

//   /* enable SDR mode, disable DAGC (bit 5) */
//   rtlsdr_demod_write_reg(dev, 0, 0x19, 0x05, 1);

//   /* init FSM state-holding register */
//   rtlsdr_demod_write_reg(dev, 1, 0x93, 0xf0, 1);
//   rtlsdr_demod_write_reg(dev, 1, 0x94, 0x0f, 1);

//   /* disable AGC (en_dagc, bit 0) (this seems to have no effect) */
//   rtlsdr_demod_write_reg(dev, 1, 0x11, 0x00, 1);

//   /* disable RF and IF AGC loop */
//   rtlsdr_demod_write_reg(dev, 1, 0x04, 0x00, 1);

//   /* disable PID filter (enable_PID = 0) */
//   rtlsdr_demod_write_reg(dev, 0, 0x61, 0x60, 1);

//   /* opt_adc_iq = 0, default ADC_I/ADC_Q datapath */
//   rtlsdr_demod_write_reg(dev, 0, 0x06, 0x80, 1);

//   /* Enable Zero-IF mode (en_bbin bit), DC cancellation (en_dc_est),
// 	 * IQ estimation/compensation (en_iq_comp, en_iq_est) */
//   rtlsdr_demod_write_reg(dev, 1, 0xb1, 0x1b, 1);

//   /* disable 4.096 MHz clock output on pin TP_CK0 */
//   rtlsdr_demod_write_reg(dev, 0, 0x0d, 0x83, 1);
// }
