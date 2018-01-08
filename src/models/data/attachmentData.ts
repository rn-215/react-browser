import { Response } from '@bitwarden/jslib';

class AttachmentData {
    id: string;
    url: string;
    fileName: string;
    size: number;
    sizeName: string;

    constructor(response: Response.Attachment) {
        this.id = response.id;
        this.url = response.url;
        this.fileName = response.fileName;
        this.size = response.size;
        this.sizeName = response.sizeName;
    }
}

export { AttachmentData };
(window as any).AttachmentData = AttachmentData;
