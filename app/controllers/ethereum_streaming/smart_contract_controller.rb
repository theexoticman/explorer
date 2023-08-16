class EthereumStreaming::SmartContractController < EthereumStreaming::AddressController

  def inflow
    render 'ethereum_streaming/address/inflow'
  end

  def outflow
    render 'ethereum_streaming/address/outflow'
  end

  def calls_contracts
    render 'ethereum_streaming/address/calls_contracts'
  end


  private

  def redirect_by_type
    if !@info == 'smart_contract'
      change_controller! 'ethereum_streaming/address'
    # elsif sc.try(:currency)
    #   change_controller! 'ethereum_streaming/token'
    end
  end

end
