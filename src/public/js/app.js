$.extend({
  jpost(url, body) {
    return $.ajax({
      type: 'POST',
      url,
      data: JSON.stringify(body),
      contentType: 'application/json',
      dataType: 'json',
    });
  },
});

$('#create_coin_btn').on('click', () => {
  if ($('#coin_name').val() !== '' && $('#coin_name').val() !== '?') document.location = `/${$('#coin_name').val()}/home?new=true`;
});
$('#login').on('click', () => {
  if ($('#coin_name').val() !== '') document.location = `/${$('#coin_name').val()}/home`;
});

$('#mine_btn').on('click', () => {
  const foriegn = $('#mine_btn').attr('data-foreign');
  let url = 'mine';
  if (foriegn) url = `${url}?foreign=${foriegn}`;

  $.post(url, {
    amount: parseFloat($('#coins_to_mine').val()),
  }, (res) => {
    $('#coins_in_eco').html(res.coinsInEco);
    $('#coins_in_wallet').html(res.coinsInWallet);
    $('#time_ms').html(` CPU Time: ${res.nonce.cpu}µs`);

    updateAccounts(res.accounts);
  });
});

function updateAccounts(accounts) {
  console.log(accounts);
  accounts.forEach((account) => {
    const id = `#account_${account.name.replace('>', '-')}`;
    $(id).html(account.coins);
  });
}

$('#transfer_btn').click(() => {
  const from = $('body').attr('data-from');
  const blockChainName = $('body').attr('data-to');
  const transactions = [];
  $('.amount').each((index, e) => {
    const to = $(e).attr('id').split('input_')[1];
    const amount = $(e).val();
    if (amount !== '' && !isNaN(amount)) transactions.push({ from, to, amount: parseFloat(amount) });
  });
  if (transactions.length === 0) return;

  const url = `/transactions?blockchain=${blockChainName || from}`;
  $.jpost(url, { transactions }).then((res) => {
    $('#transfer_cpu').html(` CPU Time: ${res.cpu}µs`);
    updateAccounts((res.accounts));
  });
});
