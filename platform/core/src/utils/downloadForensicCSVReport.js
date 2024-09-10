import { DicomMetadataStore } from '../services/DicomMetadataStore/DicomMetadataStore'

export default async function downloadForensicCSVReport(measurementData) {
  if (measurementData.length === 0) {
    // Prevent download of report with no measurements.
    return;
  }

  const columns = [
    'StudyInstanceUID',
    'SOPInstanceUID',
    'Label',
  ];

  const reportMap = {};
  for (const measurement of measurementData) {
    const { referenceStudyUID, referenceSeriesUID, getReport, uid } = measurement;

    if (!getReport) {
      console.warn('Measurement does not have a getReport function');
      return;
    }

    const seriesMetadata = DicomMetadataStore.getSeries(referenceStudyUID, referenceSeriesUID);

    const commonRowItems = _getCommonRowItems(measurement, seriesMetadata);
    const report = getReport(measurement);

    // removes AnnotationType since we don't need it
    report.columns.shift();
    report.values.shift();

    report.columns[2] = 'Centroid X';
    report.columns.push('Centroid Y');
    const points = report.values[2].split(";");
    const point1 = points[0].split(" ");
    point1.shift();
    const point2 = points[1].split(" ");
    point2.shift();

    const centroid = midpoint(point1, point2);

    const params = {
      'study_uid': referenceStudyUID,
      'instance_id': measurement.SOPInstanceUID,
      'centroid': centroid
    };
    const response = await sendCoordinateRequest(params);

    report.values[2] = response['x'];
    report.values.push(response['y']);

    reportMap[uid] = {
      report,
      commonRowItems,
    };
  }
  // get columns names inside the report from each measurement and
  // add them to the rows array (this way we can add columns for any custom
  // measurements that may be added in the future)
  Object.keys(reportMap).forEach(id => {
    const { report } = reportMap[id];
    report.columns.forEach(column => {
      if (!columns.includes(column)) {
        columns.push(column);
      }
    });
  });

  const results = _mapReportsToRowArray(reportMap, columns);

  // const report_data = { 'data': results };
  // const response = await sendReportRequest(report_data);

  let csvContent = 'data:text/csv;charset=utf-8,' + results.map(res => res.join(',')).join('\n');

  _createAndDownloadFile(csvContent);
}

function midpoint(p1, p2) {
  return [(parseFloat(p1[0]) + parseFloat(p2[0])) / 2, -(parseFloat(p1[1]) + parseFloat(p2[1])) / 2]
}

function _mapReportsToRowArray(reportMap, columns) {
  const results = [columns];
  Object.keys(reportMap).forEach(id => {
    const { report, commonRowItems } = reportMap[id];
    const row = [];
    // For commonRowItems, find the correct index and add the value to the
    // correct row in the results array
    Object.keys(commonRowItems).forEach(key => {
      const index = columns.indexOf(key);
      const value = commonRowItems[key];
      row[index] = value;
    });

    // For each annotation data, find the correct index and add the value to the
    // correct row in the results array
    report.columns.forEach((column, index) => {
      const colIndex = columns.indexOf(column);
      const value = report.values[index];
      row[colIndex] = value;
    });

    results.push(row);
  });

  return results;
}

function _getCommonRowItems(measurement, seriesMetadata) {

  return {
    StudyInstanceUID: measurement.referenceStudyUID, // StudyInstanceUID
    SOPInstanceUID: measurement.SOPInstanceUID, // SOPInstanceUID
    Label: measurement.label || '', // Label
  };
}

function _createAndDownloadFile(csvContent) {
  console.log(csvContent);
  const encodedUri = encodeURI(csvContent);

  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', 'MeasurementReport.csv');
  document.body.appendChild(link);
  link.click();
}

function sendCoordinateRequest(params) {
  const base_url = 'http://localhost:8000/wfov_coordinate';
  const url_params = new URLSearchParams();
  for (let key in params) {
    const val = params[key];
    console.log(key, val);
    if (typeof val == "string") {
      url_params.append(key, val);
    } else {
      val.forEach(element => {
        url_params.append(key, element);
      });
    }
  }
  const url = `${base_url}?${url_params.toString()}`

  return fetch(url, {
    method: 'GET',
  }).then(response => response.json()).catch(error => error);
}

function sendReportRequest(params) {
  const base_url = 'http://localhost:8000/report';

  return fetch(base_url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params)
  }).then(response => {
    if (response.ok) {
      return response.json();
    } else {
      throw new Error(`Request failed with status ${response.status}. Error ${response.json()}`);
    }
  });
}
