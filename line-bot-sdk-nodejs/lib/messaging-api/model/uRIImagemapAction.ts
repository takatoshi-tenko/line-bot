/**
 * LINE Messaging API
 * This document describes LINE Messaging API.
 *
 * The version of the OpenAPI document: 0.0.1
 *
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */

import { ImagemapAction } from "./imagemapAction.js";
import { ImagemapArea } from "./imagemapArea.js";

import { ImagemapActionBase } from "./models.js";

export type URIImagemapAction = ImagemapActionBase & {
  type: "uri";
  /**
   */
  linkUri: string /**/;
  /**
   */
  label?: string /**/;
};
