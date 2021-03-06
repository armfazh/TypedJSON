import {isReflectMetadataSupported, logError, MISSING_REFLECT_CONF_MSG, nameof} from './helpers';
import {injectMetadataInformation} from './metadata';
import {extractOptionBase, OptionsBase} from './options-base';
import {isTypelike, MapOptions, MapT, TypeDescriptor} from './type-descriptor';

declare abstract class Reflect {
    static getMetadata(metadataKey: string, target: any, targetKey: string | symbol): any;
}

export interface IJsonMapMemberOptions extends OptionsBase, Partial<MapOptions> {
    /** When set, indicates that the member must be present when deserializing. */
    isRequired?: boolean | null;

    /** When set, a default value is emitted for each uninitialized json member. */
    emitDefaultValue?: boolean | null;

    /** When set, the key on the JSON that should be used instead of the class property name */
    name?: string | null;

    /**
     * When set, this deserializer will be used to deserialize the member. The callee must assure
     * the correct type.
     */
    deserializer?: ((json: any) => any) | null;

    /** When set, this serializer will be used to serialize the member. */
    serializer?: ((value: any) => any) | null;
}

/**
 * Specifies that the property is part of the object when serializing.
 * Use this decorator on properties of type Map<K, V>.
 * @param keyConstructor Constructor of map keys (e.g. 'Number' for 'Map<number, Date>').
 * @param valueConstructor Constructor of map values (e.g. 'Date' for 'Map<number, Date>').
 * @param options Additional options.
 */
export function jsonMapMember(
    keyConstructor: Function | TypeDescriptor,
    valueConstructor: Function | TypeDescriptor,
    options: IJsonMapMemberOptions = {},
) {
    return (target: Object, propKey: string | symbol) => {
        // For error messages
        const decoratorName = `@jsonMapMember on ${nameof(target.constructor)}.${String(propKey)}`;

        if (!isTypelike(keyConstructor)) {
            logError(`${decoratorName}: could not resolve constructor of map keys at runtime.`);
            return;
        }

        if (!isTypelike(valueConstructor)) {
            logError(`${decoratorName}: could not resolve constructor of map values at runtime.`);
            return;
        }

        // If ReflectDecorators is available, use it to check whether 'jsonMapMember' has been used
        // on a map. Warn if not.
        if (isReflectMetadataSupported
            && Reflect.getMetadata('design:type', target, propKey) !== Map) {
            logError(`${decoratorName}: property is not a Map. ${MISSING_REFLECT_CONF_MSG}`);
            return;
        }

        injectMetadataInformation(target, propKey, {
            type: MapT(keyConstructor, valueConstructor, {shape: options.shape}),
            emitDefaultValue: options.emitDefaultValue,
            isRequired: options.isRequired,
            options: extractOptionBase(options),
            key: propKey.toString(),
            name: options.name ?? propKey.toString(),
            deserializer: options.deserializer,
            serializer: options.serializer,
        });
    };
}
