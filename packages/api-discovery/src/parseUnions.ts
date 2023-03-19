import { EnumData } from "@grimo/metadata"
import { apiName } from "./common"
import { CompositeRecord } from "./findComposites"
import { DomainRecord } from "./findDomains"

/** Experimental. */
export default function parseUnions(domains: DomainRecord[], composites: CompositeRecord[], enums: EnumData[]) {
  return domains.filter(domain => /grimo:union/.test(domain.comment)).map(domain => {
    const unionType = composites.find(c => c.name === `${domain.name}_union`)!
    const tagAttribute = unionType.attributes.find(a => a.name === "tag")!
    const tagDomain = domains.find(d => d.name === tagAttribute.udt)!
    const tagEnum = enums.find(c => c.name === tagDomain.type)!
    return {
      name: domain.name,
      apiName: apiName(domain.name),
      type: unionType.name,
    }
  }).filter(Boolean)
}