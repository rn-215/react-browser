import { Enums } from '@bitwarden/jslib';

class FieldData {
    type: Enums.FieldType;
    name: string;
    value: string;

    constructor(response: any) {
        this.type = response.Type;
        this.name = response.Name;
        this.value = response.Value;
    }
}

export { FieldData };
(window as any).FieldData = FieldData;
