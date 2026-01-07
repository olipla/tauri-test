export function useMSPSerialFlash(sendSerial: (data: string) => Promise<void>) {
  // 80 21 00 11 be 65 be 65 be 65 be 65 b2 65 be 65 22 65 be 65 5c 65 a2 65 be 65 be 65 be 65 be 65 be 65 86 65 32 76

  // const data = [0x80, 0x21, 0x00, 0x11, 0xBE, 0x65, 0xBE, 0x65, 0xBE, 0x65, 0xBE, 0x65, 0xB2, 0x65, 0xBE, 0x65, 0x22, 0x65, 0xBE, 0x65, 0x5C, 0x65, 0xA2, 0x65, 0xBE, 0x65, 0xBE, 0x65, 0xBE, 0x65, 0xBE, 0x65, 0xBE, 0x65, 0x86, 0x65, 0x32, 0x76]

  // function calculateChecksum(data: number[]): { CKH: number, CKL: number } {
  // // Ensure we have an even number of bytes (pad with 0 if odd)
  //   const bytes = [...data]
  //   if (bytes.length % 2 !== 0) {
  //     bytes.push(0)
  //   }

  //   // XOR all words (pairs of bytes)
  //   let checksum = 0
  //   for (let i = 0; i < bytes.length; i += 2) {
  //     const byte = bytes[i]
  //     const nextByte = bytes[i + 1]
  //     if (byte === undefined || nextByte === undefined) {
  //       break
  //     }
  //     const word = byte + (nextByte << 8) // B_i + 256 × B_(i+1)
  //     checksum ^= word
  //   }

  //   // Invert the result (bitwise NOT for 16-bit value)
  //   checksum = (~checksum) & 0xFFFF

  //   // Split into low and high bytes
  //   const CKL = checksum & 0xFF
  //   const CKH = (checksum >> 8) & 0xFF

  //   return { CKH, CKL }
  // }

  // function calculateChecksum2(data: number[]){
  //   let crc = 0xFFFF
  //   for(const byte of data){

  //   }
  // }
  return {}
}
