import { RadioDevice } from "./radio_device";

export enum USB_REG {
  USB_SYSCTL = 0x2000,
  USB_CTRL = 0x2010,
  USB_STAT = 0x2014,
  USB_EPA_CFG = 0x2144,
  USB_EPA_CTL = 0x2148,
  USB_EPA_MAXPKT = 0x2158,
  USB_EPA_MAXPKT_2 = 0x215a,
  USB_EPA_FIFO_CFG = 0x2160
}

export enum BLOCKS {
  DEMODB = 0,
  USBB = 1,
  SYSB = 2,
  TUNB = 3,
  ROMB = 4,
  IRB = 5,
  IICB = 6
}

// https://github.com/steve-m/librtlsdr/blob/18bf26989c926a5db4fca29e7d859af42af1437c/src/librtlsdr.c#L382
export enum SYS_REG {
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

export async function rtlsdr_i2c_read_reg(
  dev: RadioDevice,
  i2c_addr: number,
  reg: number
) {
  const addr = i2c_addr;
  const data = new Uint8Array(1);
  const regMessage = new Uint8Array([reg]);

  await rtlsdr_write_array(dev, BLOCKS.IICB, addr, regMessage, 1);
  return await rtlsdr_read_array(dev, BLOCKS.IICB, addr, data, 1);
}

export async function rtlsdr_read_array(
  dev: RadioDevice,
  block: number,
  addr: number,
  array: Uint8Array,
  len: number
) {
  const index = block << 8;

  // r = libusb_control_transfer(dev->devh, CTRL_IN, 0, addr, index, array, len, CTRL_TIMEOUT);
  const r = await dev.usb.controlTransferIn(
    {
      requestType: USBRequestType.VENDOR,
      recipient: USBRecipient.DEVICE,
      request: 0,
      value: addr,
      index
    },
    len
  );

  if (r.status !== "ok") {
    console.error(r);
    throw new Error("Unable to read_array");
  } else {
    return r.data!.getUint8(0);
  }
}

export async function rtlsdr_write_array(
  dev: RadioDevice,
  block: number,
  addr: number,
  array: Uint8Array,
  len: number
) {
  const index = (block << 8) | 0x10;

  // r = libusb_control_transfer(dev->devh, CTRL_OUT, 0, addr, index, array, len, CTRL_TIMEOUT);

  const r = await dev.usb.controlTransferOut(
    {
      requestType: USBRequestType.VENDOR,
      recipient: USBRecipient.DEVICE,
      request: 0,
      value: addr,
      index
    },
    array
  );

  return r;
}

export async function rtlsdr_write_reg(
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

export async function rtlsdr_demod_read_reg(
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

  reg = (r.data!.getUint8(1) << 8) | r.data!.getUint8(0);

  return reg;
}

export async function rtlsdr_demod_write_reg(
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

export async function rtlsdr_set_fir(device: RadioDevice) {
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

export async function rtlsdr_set_i2c_repeater(
  device: RadioDevice,
  on: boolean
) {
  return rtlsdr_demod_write_reg(device, 1, 0x01, on ? 0x18 : 0x10, 1);
}
