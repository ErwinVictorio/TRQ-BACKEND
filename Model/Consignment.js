import { ExecuteRecordSetQry } from "../config/connect.js";



export async function LoadBarcodeType(desLocationcode) {

	try {
		const qry = `
    select case when s_barcode_type is null then 'REGULAR'
	   else s_barcode_type
	   end as s_barcod_type
        from barcode_data.dbo.v_barcode_type
        where s_location_code = '${desLocationcode}'
    `;

		const result = await ExecuteRecordSetQry(qry);
		return result.recordset[0]
	} catch (error) {
		console.log(error.message)
	}

}


export async function SKU_VALIDATION(stockNumber, uniPrice) {

	try {
		const qry = `

--- CHECK SKU
use erpdata_new
declare @s_item_desc varchar(100) = '${stockNumber}',
@Price varchar(20) = '${uniPrice}',

@SmClassName varchar (100), 
@RobClassName varchar(100), 
@RobSubclassName varchar(100), 
@IcmClassName varchar(100),
@BrandName varchar(100),
@Metro varchar(100)


select @SmClassName = sm_class_desc
,@RobClassName = rob_class
,@RobSubclassName = rob_subclass
,@IcmClassName = icm_class
,@BrandName = s_brand_name
,@Metro = metro_class

from (select  top 1 s_item_desc
,brand.s_brand_name
,item_type.s_item_type_desc
,class.s_class_desc s_class
,subclass.s_class_desc s_subclass
,case when sm_class = 'BAG' then 'Bag'
	  when sm_class = 'BEL' then 'Belt'
	  when sm_class = 'WAL' then 'Wallet'
	  when sm_class = 'GIF' then 'Gift Set'
	  when sm_class = 'BB1' then 'Belt Buy1Take1'
	  when sm_class = 'BW1' then 'Wallet Buy1Take1'
	  else 'N/A'
	  end as sm_class_desc
,case when rob_class.consign_description is null then 'N/A'
	else rtrim(replace(rob_class.consign_description,NCHAR(0x00A0),'')) 
	end as rob_class
,case when rob_subclass.consign_description is null then ''
	else rtrim(replace(rob_subclass.consign_description,NCHAR(0x00A0),'')) 
	end as rob_subclass
,case when icm.consign_description is null then 'N/A'
	else icm.consign_description
	end as icm_class
,s_item_category_code
,sku.s_um_desc s_sku
,purchaseUM.s_um_desc s_purchase_um
,issuanceUM.s_um_desc s_selling_um
,item.d_standard_cost
,item.c_non_inventory_flag
,item.metro_class
 from item item

inner join brand brand
on item.s_brand_code = brand.s_brand_code

inner join item_type item_type
on item.s_item_type_code= item_type.s_item_type_code

inner join class class
on item.s_class = class.s_class
and class.s_subclass = ''


inner join class subclass
on item.s_subclass = subclass.s_subclass


left outer join consignor_class rob_class
on item.rob_class = rob_class.consign_class_code
and rob_class.consign_code = 'RDS'
and rob_class.consign_subclass_code = ''

left outer join consignor_class rob_subclass
on item.rob_subclass = rob_subclass.consign_subclass_code
and item.rob_class = rob_subclass.consign_class_code
and rob_subclass.consign_code = 'RDS'


left outer join consignor_class icm
on item.icm_class = icm.consign_class_code
and icm.consign_code = 'ICM'


--SKU
inner join um sku
on item.s_um_code = sku.s_um_code

--Purchase UM
inner join um purchaseUM
on item.s_purchase_um = purchaseUM.s_um_code

--selling UM
inner join um issuanceUM 
on item.s_selling_um = issuanceUM.s_um_code

where s_item_desc = @s_item_desc) aa


select top 1 d_unit_price from erpdata_new.dbo.price_list
where s_item_code in (select s_item_code from erpdata_new.dbo.item where s_item_desc = @s_item_desc)
and s_price_list_type_code  ='MCJIM'
and dt_effective <= GETDATE()

order by dt_effective desc

DECLARE 
@Brandcode varchar(100), 
@SmClass varchar (100), 
@RobClass varchar(100), 
@RobSubclass varchar(100), 
@IcmClass varchar(100),
@Kcc varchar(100),
@Victoria varchar(100),
@MonteganiBrand varchar(2)


DECLARE @Sm_SKU_Count int, --2
@Rob_SKU_Count int, -- 2
@Icm_SKU_Count int, -- 1
@Metro_SKU_Count int, -- 2
@Kcc_SKU_Count varchar(5), -- YES OR NO
@Victoria_SKU_Count varchar(5), -- YES OR NO
@LandMark_SKU_Count int -- 1



--TABLE 0 Brand code
select @Brandcode = s_brand_code from brand
where s_brand_name = @BrandName


--TABLE 4 Robinsons class code
select @Robclass = consign_class_code from consignor_class
where consign_code = 'RDS'
and rtrim(replace(consign_description,NCHAR(0x00A0),'')) = @RobClassName

--TABLE 5 Robinsons subclass code
select @RobSubclass = consign_subclass_code from consignor_class
where consign_code = 'RDS'
and rtrim(replace(consign_description,NCHAR(0x00A0),'')) = @RobSubclassName


--TABLE 6 ICM class code
select @IcmClass = consign_class_code from consignor_class
where consign_code = 'ICM'
and rtrim(replace(consign_description,NCHAR(0x00A0),'')) = @IcmClassName

select @SmClass = case @SmClassName
	when 'N/A' then NULL
	when 'Bag' then 'BAG'
	when 'Belt' then 'BEL'
	when 'Wallet' then 'WAL'
	when 'Belt Buy1Take1' then 'BB1'
	when 'Gift Set' then 'GIF'
	when 'Wallet Buy1Take1' then 'BW1'
	else NULL
end

--Start SKU Checking--

-- SM---
    select @Sm_SKU_Count = count(*) from tbl_skus.dbo.sku_sm
    where class = @SmClass
    and sm_price = @Price
--additional for stock,color,size
    and sm_stockno = @s_item_desc


--- Montegani Brand---
if @Brandcode = 'MONTEGANI'
begin
	set @MonteganiBrand = 'M'
End
else
Begin
	set @MonteganiBrand = 'NM'
End


--Ribinson--
select @Rob_SKU_Count = count(*) from tbl_skus.dbo.sku_rob_new 
where class = @RobClass
and subclass = @RobSubclass
and s_price = @Price
and s_brand = @MonteganiBrand


--Icm --

select @Icm_SKU_Count = count(*) from tbl_skus.dbo.icm_sku
where s_item_class = @IcmClass
and d_price = @Price

-- Metro--

select @Metro_SKU_Count = count(*) from tbl_skus.dbo.metro_sku
where s_itemclass = @Metro
and s_price = @Price
and s_remarks in ('REGULAR','UP')
and c_active = 'Y'


-- Kcc ---

select @Kcc_SKU_Count = case when d_price = @Price then 'OK'
else 'NO'
end 
 from tbl_skus.dbo.kcc_sku
where s_item_desc = @s_item_desc

-- SWM --

select @Victoria_SKU_Count = case when price = @Price then 'OK'
else 'NO'
end from tbl_skus.dbo.victoria_sku
where stockno = @s_item_desc

-- LANDMARK --
select @LandMark_SKU_Count = case when count(*) >= 1 then 1 else 0 end from (
	select top 1 
		(	
		CASE
			WHEN sm_class = 'BAG' THEN '3'
			WHEN sm_class = 'BEL' THEN '2'
			WHEN sm_class = 'WAL'  THEN '1'
			ELSE '16'
		END 
	) as s_sub_class, sm_class as s_raw_class from erpdata_new.dbo.item where s_item_desc = @s_item_desc
)class

inner join tbl_skus.dbo.landmark_sku as landmark on landmark.s_sub_class = class.s_sub_class
	and 
		cast(replace(landmark.s_retail, ',','') as decimal(13,2)) = cast(replace(@Price, ',','') as decimal(13,2))
	and
		landmark.s_pos_description like ('%' + class.s_raw_class +'%')
/*

DECLARE @Sm_SKU_Count int, --2
@Rob_SKU_Count int, -- 2
@Icm_SKU_Count int, -- 1
@Metro_SKU_Count int, -- 2
@Kcc_SKU_Count varchar(5), -- YES OR NO
@Victoria_SKU_Count varchar(5), -- YES OR NO
@LandMark_SKU_Count int --1
*/
select 
case when @Sm_SKU_Count = 0 THEN 'X' when @Sm_SKU_Count = 1 THEN 'NO' ELSE 'OK' end as s_sm_sku_count, 
case when @Rob_SKU_Count = 0 THEN 'X' when @Rob_SKU_Count = 1 THEN 'NO' ELSE 'OK' end  as s_rob_sku_count,
case when @Icm_SKU_Count = 0 THEN 'X' when @Icm_SKU_Count = 1 THEN 'OK' ELSE 'X' end  as s_icm_sku_count , 
case when @Metro_SKU_Count = 0 THEN 'X' when @Metro_SKU_Count = 1 THEN 'NO' ELSE 'OK' end  as s_metro_sku_count, 
case when @Kcc_SKU_Count is NULL then 'X' else @Kcc_SKU_Count end as Kcc, 
case when @Victoria_SKU_Count is NULL then 'X' else @Victoria_SKU_Count end  as Victoria,
case when @LandMark_SKU_Count = 0 then 'X' else 'OK' end as s_landmark_sku_count

 
    `;

		const result = await ExecuteRecordSetQry(qry);
		return result.recordsets
	} catch (error) {
		console.log(error.message)
	}

}



// for creating TRQ



