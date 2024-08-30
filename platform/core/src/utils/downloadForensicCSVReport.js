import { DicomMetadataStore } from '../services/DicomMetadataStore/DicomMetadataStore';

export default function downloadForensicCSVReport(measurementData) {
  if (measurementData.length === 0) {
    // Prevent download of report with no measurements.
    return;
  }

  const columns = [
    'Patient ID',
    'Patient Name',
    'StudyInstanceUID',
    'SeriesInstanceUID',
    'SOPInstanceUID',
    'Label',
  ];

  const reportMap = {};
  measurementData.forEach(measurement => {
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
    console.log(points);
    const point1 = points[0].split(" ");
    point1.shift();
    const point2 = points[1].split(" ");
    point2.shift();

    console.log(point1, point2);

    const centroid = midpoint(point1, point2);
    report.values[2] = centroid[0];
    report.values.push(centroid[1]);

    console.log(report);

    reportMap[uid] = {
      report,
      commonRowItems,
    };
  });
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

  console.log('mak nug', results);

  let csvContent = 'data:text/csv;charset=utf-8,' + results.map(res => res.join(',')).join('\n');

  _createAndDownloadFile(csvContent);
}

function midpoint(p1, p2) {
  return p1.map((value, index) => (parseFloat(value) + parseFloat(p2[index])) / 2);
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
  const firstInstance = seriesMetadata.instances[0];

  return {
    'Patient ID': firstInstance.PatientID, // Patient ID
    'Patient Name': firstInstance.PatientName?.Alphabetic || '', // Patient Name
    StudyInstanceUID: measurement.referenceStudyUID, // StudyInstanceUID
    SeriesInstanceUID: measurement.referenceSeriesUID, // SeriesInstanceUID
    SOPInstanceUID: measurement.SOPInstanceUID, // SOPInstanceUID
    Label: measurement.label || '', // Label
  };
}

function _createAndDownloadFile(csvContent) {
  const encodedUri = encodeURI(csvContent);

  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', 'MeasurementReport.csv');
  document.body.appendChild(link);
  link.click();
}
