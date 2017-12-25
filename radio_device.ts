/*
 * FIR coefficients.
 *
 * The filter is running at XTal frequency. It is symmetric filter with 32
 * coefficients. Only first 16 coefficients are specified, the other 16
 * use the same values but in reversed order. The first coefficient in
 * the array is the outer one, the last, the last is the inner one.
 * First 8 coefficients are 8 bit signed integers, the next 8 coefficients
 * are 12 bit signed integers. All coefficients have the same weight.
 *
 * Default FIR coefficients used for DAB/FM by the Windows driver,
 * the DVB driver uses different ones
 *
 */

const fir_default = [
  -54,
  -36,
  -41,
  -40,
  -32,
  -14,
  14,
  53 /* 8 bit signed */,
  101,
  156,
  215,
  273,
  327,
  372,
  404,
  421 /* 12 bit signed */
];

export class RadioDevice {
  fir: number[];

  constructor(public usb: USBDevice) {
    this.fir = Array.from(fir_default);
  }

  async claimIntefaces() {
    await this.claimInterface(this.usb, "in");
  }

  private claimInterface(device: USBDevice, direction: "in" | "out") {
    for (const iface of device.configuration!.interfaces) {
      if (iface.claimed !== true) {
        for (const alternateInteface of iface.alternates) {
          for (const endpoint of alternateInteface.endpoints) {
            if (endpoint.direction === direction) {
              console.info(
                `Interface ${
                  iface.interfaceNumber
                } claimed for direction ${direction}`
              );
              return device.claimInterface(iface.interfaceNumber);
            }
          }
        }
      }
    }

    return Promise.reject(
      new Error(`unable to find an interface for directions ${direction}`)
    );
  }
}
