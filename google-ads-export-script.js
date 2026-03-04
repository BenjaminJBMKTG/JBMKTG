/**
 * Google Ads Daily Export Script
 * Exports campaign performance data to Google Sheets
 * 
 * SETUP:
 * 1. Create a new Google Sheet
 * 2. Paste the sheet URL below
 * 3. Run once to test, then schedule daily
 */

var CONFIG = {
  SPREADSHEET_URL: 'https://docs.google.com/spreadsheets/d/1QUsYVZLYa4h9knDNsYvshCiepsCK-tjRkaxdIgwOrG0/edit',
  
  // How many days of data to export each run
  LOOKBACK_DAYS: 30,
  
  // Sheet names
  DAILY_SHEET: 'Daily Performance',
  CAMPAIGN_SHEET: 'Campaign Performance',
  SUMMARY_SHEET: 'Summary',
  CONVERSION_SHEET: 'Conversion Actions'
};

function main() {
  var spreadsheet = SpreadsheetApp.openByUrl(CONFIG.SPREADSHEET_URL);
  
  var today = new Date();
  var startDate = new Date(today.getTime() - (CONFIG.LOOKBACK_DAYS * 24 * 60 * 60 * 1000));
  
  var dateFrom = formatDate(startDate);
  var dateTo = formatDate(today);
  var dateRange = ">= '" + dateFrom + "' AND segments.date <= '" + dateTo + "'";
  
  exportDailyPerformance(spreadsheet, dateRange);
  exportCampaignPerformance(spreadsheet, dateRange);
  exportConversionActions(spreadsheet, dateRange);
  exportSummary(spreadsheet, today);
  
  Logger.log('Export complete: ' + new Date());
}

function exportDailyPerformance(spreadsheet, dateRange) {
  var sheet = getOrCreateSheet(spreadsheet, CONFIG.DAILY_SHEET);
  sheet.clear();
  
  var headers = [
    'Date', 'Account', 'Campaign', 'Campaign Type',
    'Impressions', 'Clicks', 'CTR', 'Avg CPC',
    'Cost', 'Conversions', 'Conv Rate', 'Cost/Conv',
    'Conv Value', 'ROAS', 'Status'
  ];
  sheet.appendRow(headers);
  
  var query = 'SELECT ' +
    'segments.date, ' +
    'customer.descriptive_name, ' +
    'campaign.name, ' +
    'campaign.advertising_channel_type, ' +
    'metrics.impressions, ' +
    'metrics.clicks, ' +
    'metrics.ctr, ' +
    'metrics.average_cpc, ' +
    'metrics.cost_micros, ' +
    'metrics.conversions, ' +
    'metrics.conversions_from_interactions_rate, ' +
    'metrics.cost_per_conversion, ' +
    'metrics.conversions_value, ' +
    'campaign.status ' +
    'FROM campaign ' +
    'WHERE segments.date ' + dateRange + ' ' +
    'AND metrics.impressions > 0 ' +
    'ORDER BY segments.date DESC, metrics.cost_micros DESC';
  
  var rows = [];
  var report = AdsApp.search(query);
  
  while (report.hasNext()) {
    var row = report.next();
    var cost = row.metrics.costMicros / 1000000;
    var convValue = row.metrics.conversionsValue || 0;
    var roas = cost > 0 ? (convValue / cost) : 0;
    
    rows.push([
      row.segments.date,
      row.customer.descriptiveName,
      row.campaign.name,
      row.campaign.advertisingChannelType,
      row.metrics.impressions,
      row.metrics.clicks,
      (row.metrics.ctr * 100).toFixed(2) + '%',
      (row.metrics.averageCpc / 1000000).toFixed(2),
      cost.toFixed(2),
      row.metrics.conversions.toFixed(1),
      (row.metrics.conversionsFromInteractionsRate * 100).toFixed(2) + '%',
      row.metrics.costPerConversion ? (row.metrics.costPerConversion / 1000000).toFixed(2) : '0.00',
      convValue.toFixed(2),
      roas.toFixed(2) + 'x',
      row.campaign.status
    ]);
  }
  
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
  
  // Format header row
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#1a1a2e');
  headerRange.setFontColor('#ffffff');
  
  Logger.log('Daily performance: ' + rows.length + ' rows');
}

function exportCampaignPerformance(spreadsheet, dateRange) {
  var sheet = getOrCreateSheet(spreadsheet, CONFIG.CAMPAIGN_SHEET);
  sheet.clear();
  
  var headers = [
    'Account', 'Campaign', 'Type', 'Status', 'Budget/Day',
    'Impressions', 'Clicks', 'CTR', 'Avg CPC',
    'Cost', 'Conversions', 'Conv Rate', 'Cost/Conv',
    'Conv Value', 'ROAS'
  ];
  sheet.appendRow(headers);
  
  var query = 'SELECT ' +
    'customer.descriptive_name, ' +
    'campaign.name, ' +
    'campaign.advertising_channel_type, ' +
    'campaign.status, ' +
    'campaign_budget.amount_micros, ' +
    'metrics.impressions, ' +
    'metrics.clicks, ' +
    'metrics.ctr, ' +
    'metrics.average_cpc, ' +
    'metrics.cost_micros, ' +
    'metrics.conversions, ' +
    'metrics.conversions_from_interactions_rate, ' +
    'metrics.cost_per_conversion, ' +
    'metrics.conversions_value ' +
    'FROM campaign ' +
    'WHERE segments.date ' + dateRange + ' ' +
    'AND metrics.impressions > 0 ' +
    'ORDER BY metrics.cost_micros DESC';
  
  var rows = [];
  var report = AdsApp.search(query);
  
  while (report.hasNext()) {
    var row = report.next();
    var cost = row.metrics.costMicros / 1000000;
    var convValue = row.metrics.conversionsValue || 0;
    var roas = cost > 0 ? (convValue / cost) : 0;
    var budget = row.campaignBudget.amountMicros / 1000000;
    
    rows.push([
      row.customer.descriptiveName,
      row.campaign.name,
      row.campaign.advertisingChannelType,
      row.campaign.status,
      budget.toFixed(2),
      row.metrics.impressions,
      row.metrics.clicks,
      (row.metrics.ctr * 100).toFixed(2) + '%',
      (row.metrics.averageCpc / 1000000).toFixed(2),
      cost.toFixed(2),
      row.metrics.conversions.toFixed(1),
      (row.metrics.conversionsFromInteractionsRate * 100).toFixed(2) + '%',
      row.metrics.costPerConversion ? (row.metrics.costPerConversion / 1000000).toFixed(2) : '0.00',
      convValue.toFixed(2),
      roas.toFixed(2) + 'x'
    ]);
  }
  
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
  
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#1a1a2e');
  headerRange.setFontColor('#ffffff');
  
  Logger.log('Campaign performance: ' + rows.length + ' rows');
}

function exportConversionActions(spreadsheet, dateRange) {
  var sheet = getOrCreateSheet(spreadsheet, CONFIG.CONVERSION_SHEET);
  sheet.clear();
  
  var headers = [
    'Conversion Action', 'Category', 'Campaign',
    'Conversions', 'Conv Value', 'Cost', 'CPA',
    'All Conversions', 'All Conv Value'
  ];
  sheet.appendRow(headers);
  
  // Query conversion action stats segmented by campaign
  var query = 'SELECT ' +
    'conversion_action.name, ' +
    'conversion_action.category, ' +
    'campaign.name, ' +
    'metrics.conversions, ' +
    'metrics.conversions_value, ' +
    'metrics.cost_micros, ' +
    'metrics.cost_per_conversion, ' +
    'metrics.all_conversions, ' +
    'metrics.all_conversions_value ' +
    'FROM campaign ' +
    'WHERE segments.date ' + dateRange + ' ' +
    'AND metrics.conversions > 0 ' +
    'ORDER BY conversion_action.name ASC, metrics.conversions DESC';
  
  var rows = [];
  var report = AdsApp.search(query);
  
  while (report.hasNext()) {
    var row = report.next();
    var cost = row.metrics.costMicros / 1000000;
    var convValue = row.metrics.conversionsValue || 0;
    var allConvValue = row.metrics.allConversionsValue || 0;
    
    rows.push([
      row.conversionAction.name,
      row.conversionAction.category,
      row.campaign.name,
      row.metrics.conversions.toFixed(1),
      '$' + convValue.toFixed(2),
      '$' + cost.toFixed(2),
      row.metrics.costPerConversion ? '$' + (row.metrics.costPerConversion / 1000000).toFixed(2) : '-',
      row.metrics.allConversions ? row.metrics.allConversions.toFixed(1) : '0',
      '$' + allConvValue.toFixed(2)
    ]);
  }
  
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
  
  // Also add a summary by conversion action (no campaign split)
  sheet.appendRow([]);
  sheet.appendRow(['--- Summary by Conversion Action ---']);
  var summaryHeaders = ['Conversion Action', 'Category', 'Total Conversions', 'Total Conv Value', 'Total Cost', 'CPA'];
  sheet.appendRow(summaryHeaders);
  
  var summaryQuery = 'SELECT ' +
    'conversion_action.name, ' +
    'conversion_action.category, ' +
    'metrics.conversions, ' +
    'metrics.conversions_value, ' +
    'metrics.cost_micros, ' +
    'metrics.cost_per_conversion ' +
    'FROM customer ' +
    'WHERE segments.date ' + dateRange + ' ' +
    'AND metrics.conversions > 0 ' +
    'ORDER BY metrics.conversions DESC';
  
  var summaryReport = AdsApp.search(summaryQuery);
  var summaryRows = [];
  
  while (summaryReport.hasNext()) {
    var row = summaryReport.next();
    var cost = row.metrics.costMicros / 1000000;
    
    summaryRows.push([
      row.conversionAction.name,
      row.conversionAction.category,
      row.metrics.conversions.toFixed(1),
      '$' + (row.metrics.conversionsValue || 0).toFixed(2),
      '$' + cost.toFixed(2),
      row.metrics.costPerConversion ? '$' + (row.metrics.costPerConversion / 1000000).toFixed(2) : '-'
    ]);
  }
  
  if (summaryRows.length > 0) {
    var startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, summaryRows.length, summaryHeaders.length).setValues(summaryRows);
  }
  
  // Format headers
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#1a1a2e');
  headerRange.setFontColor('#ffffff');
  
  Logger.log('Conversion actions: ' + rows.length + ' rows, ' + summaryRows.length + ' summary rows');
}

function exportSummary(spreadsheet, today) {
  var sheet = getOrCreateSheet(spreadsheet, CONFIG.SUMMARY_SHEET);
  sheet.clear();
  
  // Today's stats
  var todayStr = formatDate(today);
  
  // Last 7 days
  var weekAgo = new Date(today.getTime() - (7 * 24 * 60 * 60 * 1000));
  var weekRange = formatDate(weekAgo) + ',' + todayStr;
  
  // Last 30 days
  var monthAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
  var monthRange = formatDate(monthAgo) + ',' + todayStr;
  
  var headers = ['Period', 'Spend', 'Clicks', 'Conversions', 'CPA', 'ROAS', 'Conv Value'];
  sheet.appendRow(headers);
  
  var periods = [
    { name: 'Yesterday', range: ">= '" + formatDate(new Date(today.getTime() - 86400000)) + "' AND segments.date <= '" + formatDate(new Date(today.getTime() - 86400000)) + "'" },
    { name: 'Last 7 Days', range: ">= '" + formatDate(weekAgo) + "' AND segments.date <= '" + formatDate(today) + "'" },
    { name: 'Last 30 Days', range: ">= '" + formatDate(monthAgo) + "' AND segments.date <= '" + formatDate(today) + "'" }
  ];
  
  periods.forEach(function(period) {
    var query = 'SELECT ' +
      'metrics.cost_micros, ' +
      'metrics.clicks, ' +
      'metrics.conversions, ' +
      'metrics.conversions_value ' +
      'FROM customer ' +
      'WHERE segments.date ' + period.range;
    
    var report = AdsApp.search(query);
    var totalCost = 0, totalClicks = 0, totalConv = 0, totalValue = 0;
    
    while (report.hasNext()) {
      var row = report.next();
      totalCost += row.metrics.costMicros / 1000000;
      totalClicks += row.metrics.clicks;
      totalConv += row.metrics.conversions;
      totalValue += row.metrics.conversionsValue || 0;
    }
    
    var cpa = totalConv > 0 ? (totalCost / totalConv) : 0;
    var roas = totalCost > 0 ? (totalValue / totalCost) : 0;
    
    sheet.appendRow([
      period.name,
      '$' + totalCost.toFixed(2),
      totalClicks,
      totalConv.toFixed(1),
      '$' + cpa.toFixed(2),
      roas.toFixed(2) + 'x',
      '$' + totalValue.toFixed(2)
    ]);
  });
  
  // Add last updated timestamp
  sheet.appendRow([]);
  sheet.appendRow(['Last updated: ' + today.toISOString()]);
  
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#1a1a2e');
  headerRange.setFontColor('#ffffff');
  
  Logger.log('Summary exported');
}

// Helpers
function getOrCreateSheet(spreadsheet, name) {
  var sheet = spreadsheet.getSheetByName(name);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(name);
  }
  return sheet;
}

function formatDate(date) {
  return Utilities.formatDate(date, 'UTC', 'yyyy-MM-dd');
}
