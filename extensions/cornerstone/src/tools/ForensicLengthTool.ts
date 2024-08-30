import { LengthTool } from '@cornerstonejs/tools';
import { utilities as csUtils } from '@cornerstonejs/core';

const { transformWorldToIndex } = csUtils;

import {
  getEnabledElement,
  triggerEvent,
  eventTarget,
} from '@cornerstonejs/core';

import {
  PublicToolProps,
  ToolProps,
} from '@cornerstonejs/tools/src/types';

import { AnnotationModifiedEventDetail } from '@cornerstonejs/tools/src/types/EventTypes';

interface DistanceParams {
  trg_point: number[];
  annotation_id: string;
}

// Define the custom length tool
class ForensicLengthTool extends LengthTool {
  static toolName;
  globalHiddenAnnotationUIDsSet: Set<string> = new Set();

  constructor(
    toolProps: PublicToolProps = {},
    defaultToolProps: ToolProps = {
      supportedInteractionTypes: ['Mouse', 'Touch'],
      configuration: {
        preventHandleOutsideImage: false,
        getTextLines: defaultGetTextLines,
      },
    }
  ) {
    super(toolProps, defaultToolProps);

  }
  _calculateCachedStats(annotation, renderingEngine, enabledElement) {
    const data = annotation.data;
    const { element } = enabledElement.viewport;

    const worldPos1 = data.handles.points[0];
    const worldPos2 = data.handles.points[1];
    const { cachedStats } = data;
    const targetIds = Object.keys(cachedStats);

    // TODO clean up, this doesn't need a length per volume, it has no stats derived from volumes.
    for (let i = 0; i < targetIds.length; i++) {
      const targetId = targetIds[i];

      const image = super.getTargetIdImage(targetId, renderingEngine);

      // If image does not exists for the targetId, skip. This can be due
      // to various reasons such as if the target was a volumeViewport, and
      // the volumeViewport has been decached in the meantime.
      if (!image) {
        continue;
      }

      const { imageData, dimensions } = image;
      const index1 = transformWorldToIndex(imageData, worldPos1);
      const index2 = transformWorldToIndex(imageData, worldPos2);

      // calculate distance
      const target = [worldPos2[1], Math.abs(worldPos2[2])];
      const params: DistanceParams = {
        trg_point: target,
        annotation_id: annotation['annotationUID']
      }
      sendDistanceRequest(params).then(response => {
        length = response['distance'];
        super._isInsideVolume(index1, index2, dimensions)
          ? (this.isHandleOutsideImage = false)
          : (this.isHandleOutsideImage = true);

        cachedStats[targetId] = {
          length: length,
          unit: 'cm',
        };
        annotation.invalidated = false;
        if (cachedStats[targetId].length === undefined) {
          return;
        } else {
          // const output = this.superRender(enabledElement, this.svgHelper);
          // console.log('rendering: ', output);
        }
      }); // when this gets resolved, it will re-render the element=
    }
    triggerAnnotationModified(element, annotation);
    // Dispatching annotation modified hardcoded because cannot interpret command
    // triggerAnnotationModified(element, annotation);

    return cachedStats;
  }

}

function triggerAnnotationModified(element, annotation) {
  let enabledElement = getEnabledElement(element);
  const { viewportId, renderingEngineId } = enabledElement;
  const eventType = 'CORNERSTONE_TOOLS_ANNOTATION_MODIFIED';
  const changeType = 'HandlesUpdated';
  const eventDetail: AnnotationModifiedEventDetail = {
    annotation,
    viewportId,
    renderingEngineId,
    changeType,
  };
  triggerEvent(eventTarget, eventType, eventDetail);
}

function sendDistanceRequest(params: DistanceParams) {
  const base_url = 'http://localhost:8000/distance';
  const url_params = new URLSearchParams();
  for (let key in params) {
    const val = params[key];
    if (typeof val == "string") {
      url_params.append(key, val);
    } else {
      val.forEach(element => {
        url_params.append(key, element);
      });
    }
  }
  const url = `${base_url}/?${url_params.toString()}`

  return fetch(url, {
    method: 'GET',
  }).then(response => response.json()).catch(error => error);
}

function roundNumber(
  value: string | number | (string | number)[],
  precision = 2
): string {
  if (Array.isArray(value)) {
    return value.map((v) => roundNumber(v, precision)).join(', ');
  }
  if (value === undefined || value === null || value === '') {
    return 'NaN';
  }
  value = Number(value);
  const absValue = Math.abs(value);
  if (absValue < 0.0001) {
    return `${value}`;
  }
  const fixedPrecision =
    absValue >= 100
      ? precision - 2
      : absValue >= 10
        ? precision - 1
        : absValue >= 1
          ? precision
          : absValue >= 0.1
            ? precision + 1
            : absValue >= 0.01
              ? precision + 2
              : absValue >= 0.001
                ? precision + 3
                : precision + 4;
  return value.toFixed(fixedPrecision);
}

function defaultGetTextLines(data, targetId): string[] {
  const cachedVolumeStats = data.cachedStats[targetId];
  const { length, unit } = cachedVolumeStats;

  // Can be null on load
  if (length === undefined || length === null || isNaN(length)) {
    return;
  }

  const textLines = [`${roundNumber(length)} ${unit}`];

  return textLines;
}

ForensicLengthTool.toolName = 'ForensicLength';
export default ForensicLengthTool;
