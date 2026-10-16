import zlib from "node:zlib";
export interface ZipEntry {
    name: string;
    data: Buffer;
}
const u16 = (n: number) => {
    const b = Buffer.alloc(2);
    b.writeUInt16LE(n & 0xffff);
    return b;
};
const u32 = (n: number) => {
    const b = Buffer.alloc(4);
    b.writeUInt32LE(n >>> 0);
    return b;
};
export function zip(entries: ZipEntry[], when = new Date()): Buffer {
    const time = ((when.getHours() << 11) | (when.getMinutes() << 5) | (when.getSeconds() >> 1)) & 0xffff;
    const date = (((when.getFullYear() - 1980) << 9) | ((when.getMonth() + 1) << 5) | when.getDate()) & 0xffff;
    const seen = new Set<string>();
    const local: Buffer[] = [];
    const central: Buffer[] = [];
    let offset = 0;
    for (const e of entries) {
        let name = e.name.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\.\.(\/|$)/g, "");
        for (let n = 2; seen.has(name); n++)
            name = e.name.replace(/(\.[^./]+)?$/, `-${n}$1`);
        seen.add(name);
        const nameBytes = Buffer.from(name, "utf-8");
        const crc = zlib.crc32(e.data);
        const size = e.data.length;
        const head = Buffer.concat([u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(time), u16(date), u32(crc), u32(size), u32(size), u16(nameBytes.length), u16(0), nameBytes]);
        local.push(head, e.data);
        central.push(Buffer.concat([u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(time), u16(date), u32(crc), u32(size), u32(size), u16(nameBytes.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), nameBytes]));
        offset += head.length + size;
    }
    const dir = Buffer.concat(central);
    const end = Buffer.concat([u32(0x06054b50), u16(0), u16(0), u16(central.length), u16(central.length), u32(dir.length), u32(offset), u16(0)]);
    return Buffer.concat([...local, dir, end]);
}
