import type { WordPack } from '../types'
import { generalMix } from './general-mix'
import { asianAmerican } from './asian-american'
import { internet } from './internet'
import { workSchool } from './work-school'
import { popCulture } from './pop-culture'
import { foodGoingOut } from './food-going-out'

/** All built-in packs, in setup display order. */
export const builtinPacks: WordPack[] = [
  generalMix,
  asianAmerican,
  internet,
  workSchool,
  popCulture,
  foodGoingOut,
]
